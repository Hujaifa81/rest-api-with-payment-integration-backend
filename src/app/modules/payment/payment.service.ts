/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../../../lib/prisma";
import { stripe } from "../../../shared/helper/stripe";
import { ApiError } from "../../errors";
import httpStatus from "http-status-codes";

const restoreStockIfNeeded = async (tx: any, orderId: string) => {
  const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return null;
  if (!(order as any).stockRestored) {
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
  async handleWebhookEvent(event: any) {
    // Successful payments
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object;
      const paymentId = session?.metadata?.paymentId;
      if (!paymentId) return;
      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      if (!payment) return;

      const txRes = await prisma.$transaction(async (tx) => {
        const updated = await tx.payment.updateMany({
          where: { id: paymentId, stripeEventId: null },
          data: { status: "PAID", stripeEventId: event.id },
        });
        if (updated.count > 0) {
          await tx.order.update({ where: { id: payment.orderId }, data: { status: "PAID" } });
        }
        return updated.count;
      });
      if (txRes > 0) console.info("Processed Stripe event", event.id, "for payment", paymentId);
      else
        console.debug("Stripe event already processed or payment had stripeEventId set", event.id);
      return;
    }

    // Failed payment intents
    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object;
      const paymentIntentId = pi?.id;
      let payment = await prisma.payment.findFirst({ where: { paymentIntent: paymentIntentId } });
      if (!payment && pi?.metadata?.paymentId) {
        payment = await prisma.payment.findUnique({ where: { id: pi.metadata.paymentId } });
      }
      if (!payment) return;

      try {
        const updated = await prisma.$transaction(async (tx) => {
          const u = await tx.payment.updateMany({
            where: { id: payment!.id, stripeEventId: null },
            data: { stripeEventId: event.id },
          });
          if (u.count === 0) return 0;
          await restoreStockIfNeeded(tx, payment!.orderId);
          await tx.order.update({ where: { id: payment!.orderId }, data: { status: "FAILED" } });
          await tx.payment.update({
            where: { id: payment!.id },
            data: {
              status: "FAILED",
              errorMessage: pi?.last_payment_error?.message || "payment_failed",
            },
          });
          return 1;
        });
        if (updated > 0)
          console.info("Marked payment FAILED and restored stock for payment", payment.id);
      } catch (e) {
        console.error("Failed to mark payment/order FAILED and restore stock", e);
      }
      return;
    }

    // Checkout session expired -> mark failed/canceled
    if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      const paymentId = session?.metadata?.paymentId;
      if (!paymentId) return;
      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      if (!payment) return;

      try {
        const updated = await prisma.$transaction(async (tx) => {
          const u = await tx.payment.updateMany({
            where: { id: paymentId, stripeEventId: null },
            data: { stripeEventId: event.id },
          });
          if (u.count === 0) return 0;
          await restoreStockIfNeeded(tx, payment.orderId);
          await tx.order.update({ where: { id: payment.orderId }, data: { status: "FAILED" } });
          await tx.payment.update({ where: { id: paymentId }, data: { status: "FAILED" } });
          return 1;
        });
        if (updated > 0)
          console.info("Processed expired session and restored stock for payment", paymentId);
      } catch (e) {
        console.error(
          "Failed to mark payment/order FAILED and restore stock on expired session",
          e
        );
      }
      return;
    }
  },

  async cancelPaymentIntent(paymentIntentId: string) {
    try {
      await stripe.paymentIntents.cancel(paymentIntentId);
      return true;
    } catch (e) {
      console.error("Failed to cancel paymentIntent", paymentIntentId, e);
      return false;
    }
  },

  async checkPaymentIntentStatus(paymentIntentId: string) {
    try {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      return pi.status;
    } catch (e) {
      console.error("Failed to retrieve paymentIntent", paymentIntentId, e);
      return null;
    }
  },
  async getPaymentStatus(paymentId: string) {
    if (!paymentId) throw new ApiError(httpStatus.BAD_REQUEST, "paymentId required");
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new ApiError(httpStatus.NOT_FOUND, "Payment not found");

    // Prefer persisted paymentUrl in DB to avoid extra Stripe calls
    let paymentUrl: string | null = payment["paymentUrl"] || null;
    if (!paymentUrl && payment.stripeSessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(payment.stripeSessionId);
        paymentUrl = (session as any).url || null;
      } catch (e) {
        console.error("Failed to retrieve Stripe session", payment.stripeSessionId, e);
      }
    }

    return {
      paymentId: payment.id,
      status: payment.status,
      sessionId: payment.stripeSessionId || null,
      paymentIntent: payment.paymentIntent || null,
      paymentUrl,
    };
  },
};

export default PaymentService;
