/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { IJWTPayload } from "../../../interface/declare";
import { ApiError } from "../../errors";
import httpStatus from "http-status-codes";
import { PaymentStatus } from "../../../../generated/prisma/enums";
import { CreateOrderData } from "./order.interface";
import { v4 as uuidv4 } from "uuid";
import { OutboxEvent, Payment, Prisma } from "../../../../generated/prisma/client";
import { processOutboxEvent } from "../../../workers/outboxProcessor";
import { prisma } from "../../../lib/prisma";

const createOrder = async (orderData: CreateOrderData, token: IJWTPayload) => {
  const user = await prisma.user.findUnique({ where: { id: token.userId } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (!orderData.items || orderData.items.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Order must contain at least one item");
  }

  const createdOrder = await prisma.$transaction(async (tnx) => {
    // aggregate quantities by productId to handle duplicate product lines
    const aggregated: Record<string, number> = {};
    for (const it of orderData.items) {
      aggregated[it.productId] = (aggregated[it.productId] || 0) + it.quantity;
    }

    const uniqueProductIds = Object.keys(aggregated);

    // load current product data for pricing (use cents)
    const products = await tnx.product.findMany({
      where: { id: { in: uniqueProductIds } },
      select: { id: true, priceCents: true, quantity: true, name: true },
    });

    // build a lookup for  access and detect missing ids
    const productLookup: Record<string, (typeof products)[0]> = {};
    for (const p of products) productLookup[p.id] = p;
    const missing = uniqueProductIds.filter((id) => !productLookup[id]);
    if (missing.length) {
      throw new ApiError(httpStatus.NOT_FOUND, `Product(s) not found: ${missing.join(", ")}`);
    }

    // compute total and validate positive prices using the lookup
    let total = 0;
    for (const pid of uniqueProductIds) {
      const prod = productLookup[pid];
      if (!prod) {
        throw new ApiError(httpStatus.NOT_FOUND, `Product not found: ${pid}`);
      }
      if (prod.priceCents < 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Invalid price for product ${prod.id}`);
      }
      const qty = aggregated[pid] || 0;
      total += prod.priceCents * qty;
    }

    // atomically decrement stock using conditional updateMany
    for (const pid of uniqueProductIds) {
      const qty = aggregated[pid] ?? 0; // ensure a number
      if (qty <= 0) continue; // nothing to decrement
      const res = await tnx.product.updateMany({
        where: { id: pid, quantity: { gte: qty } },
        data: { quantity: { decrement: qty } },
      });
      if (res.count === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Insufficient stock for product ${pid}`);
      }
    }

    // create order with items recording the snapshot price
    const itemsPayload = orderData.items.map((it) => {
      const prod = productLookup[it.productId];
      if (!prod) {
        throw new ApiError(httpStatus.NOT_FOUND, `Product not found: ${it.productId}`);
      }
      return {
        productId: it.productId,
        quantity: it.quantity,
        priceCents: prod.priceCents,
      };
    });

    const order = await tnx.order.create({
      data: {
        userId: user.id,
        amountCents: total,
        status: PaymentStatus.UNPAID,
        items: { create: itemsPayload },
      },
      include: { items: true },
    });

    const transactionId = uuidv4();

    const payment = await tnx.payment.create({
      data: {
        orderId: order.id,
        amountCents: order.amountCents,
        transactionId,
      },
    });

    // create outbox event inside the same transaction so DB state is atomic
    const outbox = await tnx.outboxEvent.create({
      data: {
        topic: "CREATE_STRIPE_SESSION",
        payload: {
          orderId: order.id,
          paymentId: payment.id,
          customer_email: user?.email || undefined,
        },
      },
    });

    // return committed order, payment and outbox info from transaction
    return { order, payment, outbox };
  });

  // createdOrder contains { order, payment, outbox }
  const createdOrderTyped = createdOrder as {
    order: Prisma.OrderGetPayload<{ include: { items: true } }>;
    payment: Payment;
    outbox?: OutboxEvent;
  };
  const { order, payment } = createdOrderTyped;
  const outbox = (createdOrderTyped as any).outbox as OutboxEvent | undefined;

  // (We created the outbox event inside the transaction above.)
  // We'll let the worker build the `line_items` (it will fetch order/items and product names).

  // Let the worker process the outbox event. Immediate processing was removed
  // to keep claim/lease semantics consistent and avoid races.
  // Attempt inline processing of the outbox so we can return a usable paymentUrl
  if (outbox) {
    const inlineClaimId = `inline-${process.pid}-${Date.now()}`;
    try {
      await prisma.outboxEvent.update({
        where: { id: outbox.id },
        data: { claimedAt: new Date(), claimedBy: inlineClaimId },
      });
      await processOutboxEvent({
        id: outbox.id,
        topic: outbox.topic,
        payload: outbox.payload,
      } as any);

      const p = await prisma.payment.findUnique({ where: { id: payment.id } });
      return { paymentUrl: p?.paymentUrl || null, orderId: order.id, paymentId: payment.id };
    } catch (err: any) {
      console.error(
        "Inline outbox processing for createOrder failed, releasing claim and falling back to background worker",
        err
      );
      try {
        await prisma.outboxEvent.update({
          where: { id: outbox.id },
          data: { claimedAt: null, claimedBy: null },
        });
      } catch (clearErr) {
        console.error(
          "Failed to clear inline claim after createOrder processing failure",
          clearErr
        );
      }
      return { paymentUrl: null, orderId: order.id, paymentId: payment.id, queued: true };
    }
  }

  return { paymentUrl: null, orderId: order.id, paymentId: payment.id };
};

const createOrderWithPayLater = async (orderData: CreateOrderData, token: IJWTPayload) => {
  const user = await prisma.user.findUnique({ where: { id: token.userId } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (!orderData.items || orderData.items.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Order must contain at least one item");
  }

  const createdOrder = await prisma.$transaction(async (tnx) => {
    // aggregate quantities by productId to handle duplicate product lines
    const aggregated: Record<string, number> = {};
    for (const it of orderData.items) {
      aggregated[it.productId] = (aggregated[it.productId] || 0) + it.quantity;
    }

    const uniqueProductIds = Object.keys(aggregated);

    // load current product data for pricing (use cents)
    const products = await tnx.product.findMany({
      where: { id: { in: uniqueProductIds } },
      select: { id: true, priceCents: true, quantity: true, name: true },
    });

    const productLookup: Record<string, (typeof products)[0]> = {};
    for (const p of products) productLookup[p.id] = p;
    const missing = uniqueProductIds.filter((id) => !productLookup[id]);
    if (missing.length) {
      throw new ApiError(httpStatus.NOT_FOUND, `Product(s) not found: ${missing.join(", ")}`);
    }

    let total = 0;
    for (const pid of uniqueProductIds) {
      const prod = productLookup[pid];
      if (!prod) {
        throw new ApiError(httpStatus.NOT_FOUND, `Product not found: ${pid}`);
      }
      if (prod.priceCents < 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Invalid price for product ${prod.id}`);
      }
      const qty = aggregated[pid] || 0;
      total += prod.priceCents * qty;
    }

    // atomically decrement stock using conditional updateMany
    for (const pid of uniqueProductIds) {
      const qty = aggregated[pid] ?? 0;
      if (qty <= 0) continue;
      const res = await tnx.product.updateMany({
        where: { id: pid, quantity: { gte: qty } },
        data: { quantity: { decrement: qty } },
      });
      if (res.count === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Insufficient stock for product ${pid}`);
      }
    }

    const itemsPayload = orderData.items.map((it) => {
      const prod = productLookup[it.productId];
      if (!prod) {
        throw new ApiError(httpStatus.NOT_FOUND, `Product not found: ${it.productId}`);
      }
      return { productId: it.productId, quantity: it.quantity, priceCents: prod.priceCents };
    });

    const order = await tnx.order.create({
      data: {
        userId: user.id,
        amountCents: total,
        status: PaymentStatus.UNPAID,
        items: { create: itemsPayload },
      },
      include: { items: true },
    });

    const transactionId = uuidv4();

    const payment = await tnx.payment.create({
      data: { orderId: order.id, amountCents: order.amountCents, transactionId },
    });

    return { order, payment };
  });

  const createdOrderTyped = createdOrder as {
    order: Prisma.OrderGetPayload<{ include: { items: true } }>;
    payment: Payment;
  };
  const { order, payment } = createdOrderTyped;

  return { orderId: order.id, paymentId: payment.id, payLater: true };
};

const initiatePayment = async (
  orderId: string,
  paymentId: string,
  opts?: { customerEmail?: string; viaOutbox?: boolean }
) => {
  // outbox-first initiation: enqueue CREATE_STRIPE_SESSION so worker creates the session
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new ApiError(httpStatus.NOT_FOUND, "Payment not found");
  if (payment.orderId !== orderId)
    throw new ApiError(httpStatus.BAD_REQUEST, "Payment does not belong to order");
  if (payment.status !== "UNPAID")
    throw new ApiError(httpStatus.BAD_REQUEST, "Payment is not in unpaid state");

  // If Stripe session or intent already exists, return it
  if (payment.stripeSessionId || payment.paymentIntent) {
    return {
      sessionId: payment.stripeSessionId || null,
      paymentIntent: payment.paymentIntent || null,
    };
  }

  // Outbox-first inline processing: create outbox event with an inline claim so workers skip it,
  // then process it synchronously and return paymentUrl when successful.
  const inlineClaimId = `inline-${process.pid}-${Date.now()}`;
  const payload = {
    orderId,
    paymentId,
    ...(opts?.customerEmail ? { customer_email: opts.customerEmail } : {}),
  } as any;

  const outbox = await prisma.outboxEvent.create({
    data: {
      topic: "CREATE_STRIPE_SESSION",
      payload,
      claimedAt: new Date(),
      claimedBy: inlineClaimId,
    },
  });

  try {
    // Call the same processor used by the worker for consistent behavior
    await processOutboxEvent({
      id: outbox.id,
      topic: outbox.topic,
      payload: outbox.payload,
    } as any);

    // Fetch payment and return persisted paymentUrl/sessionId
    const p = await prisma.payment.findUnique({ where: { id: paymentId } });
    return {
      paymentUrl: p?.paymentUrl || null,
      paymentId: p?.id || null,
      orderId: p?.orderId || null,
    };
  } catch (err: any) {
    console.error(
      "Inline outbox processing failed, releasing claim and falling back to background worker",
      err
    );
    // clear claim so background workers can pick it up
    try {
      await prisma.outboxEvent.update({
        where: { id: outbox.id },
        data: { claimedAt: null, claimedBy: null },
      });
    } catch (clearErr) {
      console.error("Failed to clear inline claim after processing failure", clearErr);
    }
    return { queued: true };
  }
};

const listOrders = async (token: IJWTPayload) => {
  const user = await prisma.user.findUnique({ where: { id: token.userId } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return orders;
};

export const OrderService = {
  createOrder,
  createOrderWithPayLater,
  initiatePayment,
  listOrders,
};
