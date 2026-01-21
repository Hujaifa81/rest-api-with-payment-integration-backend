/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { IJWTPayload } from "../../../interface/declare/index.js";
import ApiError  from "../../errors/ApiError.js";
import httpStatus from "http-status-codes";
import { PaymentStatus } from "../../../../generated/prisma/enums.js";
import { CreateOrderData } from "./order.interface.js";
import { v4 as uuidv4 } from "uuid";
import { Payment, Prisma } from "../../../../generated/prisma/client.js";
import { prisma } from "../../../lib/prisma.js";
import { stripe } from "../../../shared/helper/stripe.js";

const createOrder = async (orderData: CreateOrderData, token: IJWTPayload) => {
  const user = await prisma.user.findUnique({ where: { id: token.userId } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (!orderData.items || orderData.items.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Order must contain at least one item");
  }

  const createdOrder = await prisma.$transaction(async (tnx) => {

    const aggregated: Record<string, number> = {};
    for (const it of orderData.items) {
      aggregated[it.productId] = (aggregated[it.productId] || 0) + it.quantity;
    }

    const uniqueProductIds = Object.keys(aggregated);

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

    return { order, payment };
  });

  const createdOrderTyped = createdOrder as {
    order: Prisma.OrderGetPayload<{ include: { items: true } }>;
    payment: Payment;
  };
  const { order, payment } = createdOrderTyped;

  try {
    const sessionOpts = user?.email ? { customerEmail: user.email } : undefined;
    const sessionRes = await initiatePayment(order.id, payment.id, sessionOpts as any);
    return {
      paymentUrl: (sessionRes as any)?.paymentUrl || null,
      orderId: order.id,
      paymentId: payment.id,
    };
  } catch (e) {
    console.error("createOrder: immediate payment initiation failed, returning queued result", e);
    return { paymentUrl: null, orderId: order.id, paymentId: payment.id, queued: true };
  }
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

    const aggregated: Record<string, number> = {};
    for (const it of orderData.items) {
      aggregated[it.productId] = (aggregated[it.productId] || 0) + it.quantity;
    }

    const uniqueProductIds = Object.keys(aggregated);

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
      data: {
        orderId: order.id,
        amountCents: order.amountCents,
        transactionId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
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

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new ApiError(httpStatus.NOT_FOUND, "Payment not found");
  if (payment.orderId !== orderId)
    throw new ApiError(httpStatus.BAD_REQUEST, "Payment does not belong to order");
  if (payment.status !== "UNPAID")
    throw new ApiError(httpStatus.BAD_REQUEST, "Payment is not in unpaid state");

  // Enforce expiry: if payment expired, cancel and restore stock, then block payment
  if (payment.expiresAt && new Date() > new Date(payment.expiresAt)) {
    
      const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.payment.updateMany({
          where: { id: payment.id, stripeEventId: null, status: "UNPAID" },
          data: { status: "CANCELED", errorMessage: "expired" },
        });
        if (u.count === 0) return 0;

        const order = await tx.order.findUnique({ where: { id: payment.orderId }, include: { items: true } });
        if (order && !(order as any).stockRestored) {
          for (const it of order.items) {
            await tx.product.update({ where: { id: it.productId }, data: { quantity: { increment: it.quantity } } });
          }
          await tx.order.update({ where: { id: order.id }, data: { stockRestored: true } });
        }
        return u.count;
      });
      if (updated > 0) {
        throw new ApiError(httpStatus.GONE, "Payment expired and canceled");
      }
      throw new ApiError(httpStatus.BAD_REQUEST, "Payment cannot be processed");
    
  }

  if (payment.stripeSessionId || payment.paymentIntent) {
    return {
      sessionId: payment.stripeSessionId || null,
      paymentId: payment.id || null,
    };
  }

  let line_items: any[] = [];
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
    const productIds = order.items.map((it) => it.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } });
    const nameLookup: Record<string, string> = {};
    for (const p of products) nameLookup[p.id] = p.name || "Product";
    line_items = order.items.map((it) => ({
      price_data: {
        currency: process.env.STRIPE_CURRENCY || "usd",
        product_data: { name: nameLookup[it.productId] || "Product" },
        unit_amount: it.priceCents,
      },
      quantity: it.quantity,
    }));
  } catch (e) {
    console.error("Failed to build line_items for synchronous payment", e);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to build payment items");
  }


  let session: any;
  let createdPI: any = null;
  try {
    try {
      createdPI = await stripe.paymentIntents.create({
        amount: (await prisma.order.findUnique({ where: { id: orderId } }))!.amountCents,
        currency: process.env.STRIPE_CURRENCY || "usd",
        metadata: { orderId, paymentId },
        automatic_payment_methods: { enabled: true },
      });

      if (createdPI && createdPI.id) {
        try {
          await prisma.payment.update({ where: { id: paymentId }, data: { paymentIntent: createdPI.id } });
        } catch (e) {
          console.error("Failed to persist created PaymentIntent to DB", e);
        }
      }

      const sessionParams: any = {
        payment_method_types: ["card"],
        mode: "payment",
        ...(opts?.customerEmail ? { customer_email: opts.customerEmail } : {}),
        line_items,
        metadata: { orderId, paymentId },
        success_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/payment/success`,
        cancel_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/my-orders`,
        payment_intent: createdPI?.id,
      };

      session = await stripe.checkout.sessions.create(sessionParams as any);
    } catch (piErr) {

      console.error("Creating PaymentIntent failed, falling back to session-first flow", piErr);
      const sessionParams: any = {
        payment_method_types: ["card"],
        mode: "payment",
        ...(opts?.customerEmail ? { customer_email: opts.customerEmail } : {}),
        line_items,
        metadata: { orderId, paymentId },
        success_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/payment/success`,
        cancel_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/my-orders`,
      };
      sessionParams.payment_intent_data = { metadata: { orderId, paymentId } };
      sessionParams.expand = ["payment_intent"];
      session = await stripe.checkout.sessions.create(sessionParams as any);
    }
  } catch (e) {
    console.error("Failed to create Stripe session", e);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to create Stripe session");
  }

  let retrievedSession: any = session;
  const maxRetries = 5;
  const retryDelayMs = 500;
  if (!session.payment_intent) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await new Promise((res) => setTimeout(res, retryDelayMs));
        retrievedSession = await stripe.checkout.sessions.retrieve(session.id, { expand: ["payment_intent"] } as any);
        if (retrievedSession && retrievedSession.payment_intent) break;
      } catch (err) {
        console.error("Error retrieving session retry", i + 1, err);
      }
    }
  }

  const updates: any = {};
  if (retrievedSession && retrievedSession.payment_intent) {
    updates.paymentIntent =
      typeof retrievedSession.payment_intent === "string"
        ? (retrievedSession.payment_intent as string)
        : ((retrievedSession.payment_intent as any)?.id ?? null);
  }
  if (session.id) updates.stripeSessionId = session.id;
  if ((session as any).url) updates.paymentUrl = (session as any).url as string;

  try {
    if (Object.keys(updates).length) {
      await prisma.payment.update({ where: { id: paymentId }, data: updates });
    }
  } catch (dbErr: any) {
    console.error("Failed to persist Stripe session to DB", dbErr);

    if (updates.paymentIntent) {
      try {
        await stripe.paymentIntents.cancel(updates.paymentIntent);
        console.info("Cancelled paymentIntent due to DB persist failure", updates.paymentIntent);
      } catch (cancelErr) {
        console.error("Failed to cancel paymentIntent after DB persist failure", cancelErr);
      }
    }
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to persist payment info");
  }

  return { paymentUrl: updates.paymentUrl || null, sessionId: updates.stripeSessionId || null, paymentIntent: updates.paymentIntent || null };
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
