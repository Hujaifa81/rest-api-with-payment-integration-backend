/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../lib/prisma";
import { stripe } from "../shared/helper/stripe";
import { sendDeadLetterResolvedNotification } from "../lib/notifier/email";
import cron from "node-cron";

const AUTO_RESTORE_AFTER_MS =
  (process.env.DEAD_LETTER_AUTO_RESTORE_HOURS
    ? parseInt(process.env.DEAD_LETTER_AUTO_RESTORE_HOURS, 10)
    : 24) *
  60 *
  60 *
  1000;

async function processDeadLetter(ev: any) {
  try {
    // fetch payment
    const payment = await prisma.payment.findUnique({ where: { id: ev.payload?.paymentId } });
    const orderId = ev.payload?.orderId;

    // If paymentIntent exists, check Stripe
    if (payment && payment.paymentIntent) {
      try {
        const pi = await stripe.paymentIntents.retrieve(payment.paymentIntent);
        if (pi && (pi.status === "succeeded" || pi.status === "requires_capture")) {
          // Treat as successful payment — let webhook handle, but mark resolved to avoid auto-restore
          await prisma.$transaction(async (tx) => {
            await tx.outboxEvent.update({
              where: { id: ev.id },
              data: {
                deadLetter: false,
                deadLetterResolvedAt: new Date(),
                deadLetterReason: `stripe_status_${pi.status}`,
              },
            });
          });
          console.info("Dead-letter resolved due to Stripe status", ev.id, pi.status);
          await sendDeadLetterResolvedNotification({
            outboxId: ev.id,
            orderId,
            paymentId: payment.id,
            resolution: `stripe_status_${pi.status}`,
          } as any);
          return;
        }
      } catch (e) {
        console.error("Failed to retrieve paymentIntent from Stripe", e);
      }
    }

    // Otherwise auto-restore stock if not already restored
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) {
      // nothing to do; mark resolved
      await prisma.outboxEvent.update({
        where: { id: ev.id },
        data: {
          deadLetter: false,
          deadLetterResolvedAt: new Date(),
          deadLetterReason: "order_not_found",
        },
      });
      return;
    }

    if (order.stockRestored) {
      await prisma.outboxEvent.update({
        where: { id: ev.id },
        data: {
          deadLetter: false,
          deadLetterResolvedAt: new Date(),
          deadLetterReason: "already_restored",
        },
      });
      return;
    }

    // perform idempotent restore
    await prisma.$transaction(async (tx) => {
      for (const it of order.items) {
        await tx.product.update({
          where: { id: it.productId },
          data: { quantity: { increment: it.quantity } },
        });
      }
      await tx.order.update({
        where: { id: order.id },
        data: { stockRestored: true, status: "CANCELED" },
      });
      await tx.payment.updateMany({ where: { orderId: order.id }, data: { status: "FAILED" } });
      await tx.outboxEvent.update({
        where: { id: ev.id },
        data: {
          deadLetter: false,
          deadLetterResolvedAt: new Date(),
          deadLetterReason: "auto_restored",
        },
      });
    });
    console.info("Auto-restored stock for dead-letter event", ev.id, "order", order.id);
    await sendDeadLetterResolvedNotification({
      outboxId: ev.id,
      orderId,
      paymentId: payment?.id,
      resolution: "auto_restored",
    } as any);
  } catch (e) {
    console.error("Failed to process dead-letter auto-restore for event", ev.id, e);
  }
}
function scheduleReconciler() {
  console.info("Dead-letter reconciler scheduled — running hourly");
  // run at minute 0 of every hour
  cron.schedule("0 * * * *", async () => {
    try {
      const cutoff = new Date(Date.now() - AUTO_RESTORE_AFTER_MS);
      const candidates = await prisma.outboxEvent.findMany({
        where: { deadLetter: true, deadLetterAt: { lt: cutoff }, deadLetterResolvedAt: null },
        take: 20,
        orderBy: { deadLetterAt: "asc" },
      });
      for (const ev of candidates) {
        await processDeadLetter(ev);
      }
    } catch (e) {
      console.error("Dead-letter reconciler job error", e);
    }
  });
}

if (require.main === module) {
  scheduleReconciler();
}

export default { scheduleReconciler };
