/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../../../lib/prisma.js";
import { stripe } from "../../../shared/helper/stripe.js";
import ApiError from "../../errors/ApiError.js";
import httpStatus from "http-status-codes";
const restoreStockIfNeeded = async (tx, orderId) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order)
        return null;
    if (!order.stockRestored) {
        for (const it of order.items) {
            await tx.product.update({
                where: { id: it.productId },
                data: { quantity: { increment: it.quantity } },
            });
        }
        await tx.order.update({ where: { id: order.id }, data: { stockRestored: true } });
    }
    return order;
};
export const PaymentService = {
    async handleWebhookEvent(event) {
        if (event.type === "checkout.session.completed" ||
            event.type === "checkout.session.async_payment_succeeded") {
            const session = event.data.object;
            const paymentId = session?.metadata?.paymentId;
            if (!paymentId)
                return;
            const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
            if (!payment)
                return;
            let paymentIntentId = null;
            try {
                if (session.payment_intent) {
                    paymentIntentId =
                        typeof session.payment_intent === "string"
                            ? session.payment_intent
                            : (session.payment_intent?.id ?? null);
                }
            }
            catch (e) {
                console.error("Failed to extract payment_intent from session", e);
            }
            const txRes = await prisma.$transaction(async (tx) => {
                const updated = await tx.payment.updateMany({
                    where: { id: paymentId, stripeEventId: null },
                    data: {
                        status: "PAID",
                        stripeEventId: event.id,
                        ...(paymentIntentId ? { paymentIntent: paymentIntentId } : {}),
                    },
                });
                if (updated.count > 0) {
                    await tx.order.update({ where: { id: payment.orderId }, data: { status: "PAID" } });
                }
                return updated.count;
            });
            if (txRes > 0)
                console.info("Processed Stripe event", event.id, "for payment", paymentId);
            else
                console.debug("Stripe event already processed or payment had stripeEventId set", event.id);
            return;
        }
        if (event.type === "payment_intent.payment_failed") {
            const pi = event.data.object;
            const paymentIntentId = pi?.id;
            let payment = await prisma.payment.findFirst({ where: { paymentIntent: paymentIntentId } });
            if (!payment && pi?.metadata?.paymentId) {
                payment = await prisma.payment.findUnique({ where: { id: pi.metadata.paymentId } });
            }
            if (!payment)
                return;
            try {
                const updated = await prisma.$transaction(async (tx) => {
                    const u = await tx.payment.updateMany({
                        where: { id: payment.id, stripeEventId: null },
                        data: { stripeEventId: event.id },
                    });
                    if (u.count === 0)
                        return 0;
                    await restoreStockIfNeeded(tx, payment.orderId);
                    await tx.order.update({ where: { id: payment.orderId }, data: { status: "FAILED" } });
                    await tx.payment.update({
                        where: { id: payment.id },
                        data: {
                            status: "FAILED",
                            errorMessage: pi?.last_payment_error?.message || "payment_failed",
                        },
                    });
                    return 1;
                });
                if (updated > 0)
                    console.info("Marked payment FAILED and restored stock for payment", payment.id);
            }
            catch (e) {
                console.error("Failed to mark payment/order FAILED and restore stock", e);
            }
            return;
        }
        if (event.type === "payment_intent.succeeded") {
            const pi = event.data.object;
            const paymentIntentId = pi?.id;
            let payment = null;
            if (paymentIntentId) {
                payment = await prisma.payment.findFirst({ where: { paymentIntent: paymentIntentId } });
            }
            if (!payment && pi?.metadata?.paymentId) {
                payment = await prisma.payment.findUnique({ where: { id: pi.metadata.paymentId } });
            }
            if (!payment)
                return;
            try {
                const updated = await prisma.$transaction(async (tx) => {
                    const u = await tx.payment.updateMany({
                        where: { id: payment.id, stripeEventId: null },
                        data: { status: "PAID", stripeEventId: event.id },
                    });
                    if (u.count === 0)
                        return 0;
                    await tx.order.update({ where: { id: payment.orderId }, data: { status: "PAID" } });
                    return 1;
                });
                if (updated > 0)
                    console.info("Processed payment_intent.succeeded and marked PAID for", payment.id);
            }
            catch (e) {
                console.error("Failed to process payment_intent.succeeded", e);
            }
            return;
        }
        if (event.type === "checkout.session.expired") {
            const session = event.data.object;
            const paymentId = session?.metadata?.paymentId;
            if (!paymentId)
                return;
            const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
            if (!payment)
                return;
            try {
                const updated = await prisma.$transaction(async (tx) => {
                    const u = await tx.payment.updateMany({
                        where: { id: paymentId, stripeEventId: null },
                        data: { stripeEventId: event.id },
                    });
                    if (u.count === 0)
                        return 0;
                    await restoreStockIfNeeded(tx, payment.orderId);
                    await tx.order.update({ where: { id: payment.orderId }, data: { status: "FAILED" } });
                    await tx.payment.update({ where: { id: paymentId }, data: { status: "FAILED" } });
                    return 1;
                });
                if (updated > 0)
                    console.info("Processed expired session and restored stock for payment", paymentId);
            }
            catch (e) {
                console.error("Failed to mark payment/order FAILED and restore stock on expired session", e);
            }
            return;
        }
    },
    async cancelPaymentIntent(paymentIntentId) {
        try {
            await stripe.paymentIntents.cancel(paymentIntentId);
            return true;
        }
        catch (e) {
            console.error("Failed to cancel paymentIntent", paymentIntentId, e);
            return false;
        }
    },
    async checkPaymentIntentStatus(paymentIntentId) {
        try {
            const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
            return pi.status;
        }
        catch (e) {
            console.error("Failed to retrieve paymentIntent", paymentIntentId, e);
            return null;
        }
    },
    async getPaymentStatus(paymentId) {
        if (!paymentId)
            throw new ApiError(httpStatus.BAD_REQUEST, "paymentId required");
        const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
        if (!payment)
            throw new ApiError(httpStatus.NOT_FOUND, "Payment not found");
        let paymentUrl = payment["paymentUrl"] || null;
        let paymentIntentId = payment.paymentIntent || null;
        if (!paymentUrl && payment.stripeSessionId) {
            try {
                const session = await stripe.checkout.sessions.retrieve(payment.stripeSessionId, {
                    expand: ["payment_intent"],
                });
                paymentUrl = session.url || null;
                if (!paymentIntentId && session.payment_intent) {
                    paymentIntentId =
                        typeof session.payment_intent === "string"
                            ? session.payment_intent
                            : (session.payment_intent?.id ?? null);
                }
                const updates = {};
                if (paymentUrl && !payment.paymentUrl)
                    updates.paymentUrl = paymentUrl;
                if (session.id && !payment.stripeSessionId)
                    updates.stripeSessionId = session.id;
                if (paymentIntentId && !payment.paymentIntent)
                    updates.paymentIntent = paymentIntentId;
                if (Object.keys(updates).length) {
                    try {
                        await prisma.payment.update({ where: { id: payment.id }, data: updates });
                        console.info("Persisted payment updates from session retrieve", {
                            paymentId: payment.id,
                            updates,
                        });
                    }
                    catch (e) {
                        console.error("Failed to persist discovered session fields to payment", e);
                    }
                }
            }
            catch (e) {
                console.error("Failed to retrieve Stripe session", payment.stripeSessionId, e);
            }
        }
        return {
            paymentId: payment.id,
            status: payment.status,
            sessionId: payment.stripeSessionId || null,
            paymentUrl,
        };
    },
};
export default PaymentService;
//# sourceMappingURL=payment.service.js.map