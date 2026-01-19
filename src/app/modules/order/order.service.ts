/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { IJWTPayload } from "../../../interface/declare";
import { prisma } from "../../../lib/prisma";
import { ApiError } from "../../errors";
import httpStatus from "http-status-codes";
import { PaymentStatus } from "../../../../generated/prisma/enums";
import { CreateOrderData } from "./order.interface";
import { v4 as uuidv4 } from "uuid";
import { OutboxEvent, Payment, Prisma } from "../../../../generated/prisma/client";

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

  // (We created the outbox event inside the transaction above.)
  // We'll let the worker build the `line_items` (it will fetch order/items and product names).

  // Let the worker process the outbox event. Immediate processing was removed
  // to keep claim/lease semantics consistent and avoid races.
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

  return { paymentUrl: null, orderId: order.id, paymentId: payment.id, payLater: true };
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

  // Default to outbox enqueue to preserve existing outbox processing and avoid creating Stripe resources inside request
  const payload = {
    orderId,
    paymentId,
    ...(opts?.customerEmail ? { customer_email: opts.customerEmail } : {}),
  };
  await prisma.outboxEvent.create({ data: { topic: "CREATE_STRIPE_SESSION", payload } });
  return { queued: true };
};

export const OrderService = {
  createOrder,
  createOrderWithPayLater,
  initiatePayment,
};
