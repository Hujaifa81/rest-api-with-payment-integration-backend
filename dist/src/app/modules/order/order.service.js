import ApiError from "../../errors/ApiError.js";
import httpStatus from "http-status-codes";
import { PaymentStatus } from "../../../../generated/prisma/enums.js";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../../../lib/prisma.js";
import { stripe } from "../../../shared/helper/stripe.js";
const createOrder = async (orderData, token) => {
    const user = await prisma.user.findUnique({ where: { id: token.userId } });
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }
    if (!orderData.items || orderData.items.length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Order must contain at least one item");
    }
    const createdOrder = await prisma.$transaction(async (tnx) => {
        const aggregated = {};
        for (const it of orderData.items) {
            aggregated[it.productId] = (aggregated[it.productId] || 0) + it.quantity;
        }
        const uniqueProductIds = Object.keys(aggregated);
        const products = await tnx.product.findMany({
            where: { id: { in: uniqueProductIds } },
            select: { id: true, priceCents: true, quantity: true, name: true },
        });
        const productLookup = {};
        for (const p of products)
            productLookup[p.id] = p;
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
            if (qty <= 0)
                continue;
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
    const createdOrderTyped = createdOrder;
    const { order, payment } = createdOrderTyped;
    try {
        const sessionOpts = user?.email ? { customerEmail: user.email } : undefined;
        const sessionRes = await initiatePayment(order.id, payment.id, sessionOpts);
        return {
            paymentUrl: sessionRes?.paymentUrl || null,
            orderId: order.id,
            paymentId: payment.id,
        };
    }
    catch (e) {
        console.error("createOrder: immediate payment initiation failed, returning queued result", e);
        return { paymentUrl: null, orderId: order.id, paymentId: payment.id, queued: true };
    }
};
const createOrderWithPayLater = async (orderData, token) => {
    const user = await prisma.user.findUnique({ where: { id: token.userId } });
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }
    if (!orderData.items || orderData.items.length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Order must contain at least one item");
    }
    const createdOrder = await prisma.$transaction(async (tnx) => {
        const aggregated = {};
        for (const it of orderData.items) {
            aggregated[it.productId] = (aggregated[it.productId] || 0) + it.quantity;
        }
        const uniqueProductIds = Object.keys(aggregated);
        const products = await tnx.product.findMany({
            where: { id: { in: uniqueProductIds } },
            select: { id: true, priceCents: true, quantity: true, name: true },
        });
        const productLookup = {};
        for (const p of products)
            productLookup[p.id] = p;
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
            if (qty <= 0)
                continue;
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
    const createdOrderTyped = createdOrder;
    const { order, payment } = createdOrderTyped;
    return { orderId: order.id, paymentId: payment.id, payLater: true };
};
const initiatePayment = async (orderId, paymentId, opts) => {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment)
        throw new ApiError(httpStatus.NOT_FOUND, "Payment not found");
    if (payment.orderId !== orderId)
        throw new ApiError(httpStatus.BAD_REQUEST, "Payment does not belong to order");
    if (payment.status !== "UNPAID")
        throw new ApiError(httpStatus.BAD_REQUEST, "Payment is not in unpaid state");
    if (payment.stripeSessionId || payment.paymentIntent) {
        return {
            sessionId: payment.stripeSessionId || null,
            paymentId: payment.id || null,
        };
    }
    let line_items = [];
    try {
        const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
        if (!order)
            throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
        const productIds = order.items.map((it) => it.productId);
        const products = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } });
        const nameLookup = {};
        for (const p of products)
            nameLookup[p.id] = p.name || "Product";
        line_items = order.items.map((it) => ({
            price_data: {
                currency: process.env.STRIPE_CURRENCY || "usd",
                product_data: { name: nameLookup[it.productId] || "Product" },
                unit_amount: it.priceCents,
            },
            quantity: it.quantity,
        }));
    }
    catch (e) {
        console.error("Failed to build line_items for synchronous payment", e);
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to build payment items");
    }
    let session;
    let createdPI = null;
    try {
        try {
            createdPI = await stripe.paymentIntents.create({
                amount: (await prisma.order.findUnique({ where: { id: orderId } })).amountCents,
                currency: process.env.STRIPE_CURRENCY || "usd",
                metadata: { orderId, paymentId },
                automatic_payment_methods: { enabled: true },
            });
            if (createdPI && createdPI.id) {
                try {
                    await prisma.payment.update({ where: { id: paymentId }, data: { paymentIntent: createdPI.id } });
                }
                catch (e) {
                    console.error("Failed to persist created PaymentIntent to DB", e);
                }
            }
            const sessionParams = {
                payment_method_types: ["card"],
                mode: "payment",
                ...(opts?.customerEmail ? { customer_email: opts.customerEmail } : {}),
                line_items,
                metadata: { orderId, paymentId },
                success_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/payment/success`,
                cancel_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/my-orders`,
                payment_intent: createdPI?.id,
            };
            session = await stripe.checkout.sessions.create(sessionParams);
        }
        catch (piErr) {
            console.error("Creating PaymentIntent failed, falling back to session-first flow", piErr);
            const sessionParams = {
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
            session = await stripe.checkout.sessions.create(sessionParams);
        }
    }
    catch (e) {
        console.error("Failed to create Stripe session", e);
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to create Stripe session");
    }
    let retrievedSession = session;
    const maxRetries = 5;
    const retryDelayMs = 500;
    if (!session.payment_intent) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                await new Promise((res) => setTimeout(res, retryDelayMs));
                retrievedSession = await stripe.checkout.sessions.retrieve(session.id, { expand: ["payment_intent"] });
                if (retrievedSession && retrievedSession.payment_intent)
                    break;
            }
            catch (err) {
                console.error("Error retrieving session retry", i + 1, err);
            }
        }
    }
    const updates = {};
    if (retrievedSession && retrievedSession.payment_intent) {
        updates.paymentIntent =
            typeof retrievedSession.payment_intent === "string"
                ? retrievedSession.payment_intent
                : (retrievedSession.payment_intent?.id ?? null);
    }
    if (session.id)
        updates.stripeSessionId = session.id;
    if (session.url)
        updates.paymentUrl = session.url;
    try {
        if (Object.keys(updates).length) {
            await prisma.payment.update({ where: { id: paymentId }, data: updates });
        }
    }
    catch (dbErr) {
        console.error("Failed to persist Stripe session to DB", dbErr);
        if (updates.paymentIntent) {
            try {
                await stripe.paymentIntents.cancel(updates.paymentIntent);
                console.info("Cancelled paymentIntent due to DB persist failure", updates.paymentIntent);
            }
            catch (cancelErr) {
                console.error("Failed to cancel paymentIntent after DB persist failure", cancelErr);
            }
        }
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to persist payment info");
    }
    return { paymentUrl: updates.paymentUrl || null, sessionId: updates.stripeSessionId || null, paymentIntent: updates.paymentIntent || null };
};
const listOrders = async (token) => {
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
//# sourceMappingURL=order.service.js.map