/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../lib/prisma";
import { stripe } from "../shared/helper/stripe";
import { sendDeadLetterNotification } from "../lib/notifier/email";

interface OutboxPayload {
  orderId: string;
  paymentId: string;
  line_items: any[];
  customer_email?: string;
}

export async function processOutboxEvent(event: { id: string; topic: string; payload: any }) {
  if (event.topic !== "CREATE_STRIPE_SESSION") return;
  const payload = event.payload as OutboxPayload;

  try {
    // If line_items not provided in payload, build them from order + products
    let line_items = payload.line_items;
    if (!line_items || !Array.isArray(line_items) || line_items.length === 0) {
      try {
        const order = await prisma.order.findUnique({
          where: { id: payload.orderId },
          include: { items: true },
        });
        if (order) {
          const productIds = order.items.map((it) => it.productId);
          const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true },
          });
          const nameLookup: Record<string, string> = {};
          for (const p of products) nameLookup[p.id] = p.name || "Product";
          line_items = order.items.map((it) => ({
            price_data: {
              currency: process.env.STRIPE_CURRENCY || "bdt",
              product_data: { name: nameLookup[it.productId] || "Product" },
              unit_amount: it.priceCents,
            },
            quantity: it.quantity,
          }));
        }
      } catch (e) {
        console.error("Failed to build line_items from order; falling back to payload", e);
        line_items = payload.line_items;
      }
    }

    const sessionParams: any = {
      payment_method_types: ["card"],
      mode: "payment",
      ...(payload.customer_email ? { customer_email: payload.customer_email } : {}),
      line_items,
      metadata: {
        orderId: payload.orderId,
        paymentId: payload.paymentId,
      },
      success_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/payment/success`,
      cancel_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/my-orders`,
    };

    const session = await stripe.checkout.sessions.create(sessionParams as any);

    // persist paymentIntent and session id
    const updates: any = {};
    if (session.payment_intent) updates.paymentIntent = session.payment_intent as string;
    if (session.id) updates.stripeSessionId = session.id;
    if ((session as any).url) updates.paymentUrl = (session as any).url as string;

    // persist paymentIntent/session and mark outbox processed atomically
    try {
      await prisma.$transaction(async (tx) => {
        if (Object.keys(updates).length) {
          await tx.payment.update({ where: { id: payload.paymentId }, data: updates });
        }
        await tx.outboxEvent.update({
          where: { id: event.id },
          data: { processed: true, processedAt: new Date() },
        });
      });
    } catch (dbErr: any) {
      console.error(
        "Failed to persist payment/outbox updates in transaction; attempting compensation",
        dbErr
      );
      let cancelSucceeded = false;
      if (updates.paymentIntent) {
        try {
          await stripe.paymentIntents.cancel(updates.paymentIntent);
          console.info("Cancelled paymentIntent", updates.paymentIntent);
          cancelSucceeded = true;
        } catch (cancelErr) {
          console.error("Failed to cancel paymentIntent during compensation", cancelErr);
          cancelSucceeded = false;
        }
      }

      if (cancelSucceeded) {
        // mark payment as FAILED and restore stock + mark order FAILED atomically if stock not yet restored
        try {
          await prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
              where: { id: payload.orderId },
              include: { items: true },
            });
            if (order && !(order as any).stockRestored) {
              for (const it of order.items) {
                await tx.product.update({
                  where: { id: it.productId },
                  data: { quantity: { increment: it.quantity } },
                });
              }
              await tx.order.update({
                where: { id: payload.orderId },
                data: { status: "FAILED", stockRestored: true },
              });
            } else {
              await tx.order.update({ where: { id: payload.orderId }, data: { status: "FAILED" } });
            }
            await tx.payment.update({
              where: { id: payload.paymentId },
              data: { status: "FAILED", errorMessage: String(dbErr?.message || dbErr) },
            });
          });
        } catch (e) {
          console.error("Failed to mark payment/order as FAILED after successful cancellation", e);
        }
      } else {
        // mark for reconciliation if we couldn't cancel
        try {
          await prisma.payment.update({
            where: { id: payload.paymentId },
            data: { status: "PENDING_RECONCILE", errorMessage: String(dbErr?.message || dbErr) },
          });
        } catch (e) {
          console.error("Failed to mark payment PENDING_RECONCILE", e);
        }
        try {
          await prisma.order.update({
            where: { id: payload.orderId },
            data: { status: "PENDING_RECONCILE" },
          });
        } catch (e) {
          console.error("Failed to mark order PENDING_RECONCILE", e);
        }
      }
      (dbErr as any).__dbPersistHandled = true;
      throw dbErr;
    }

    return { sessionUrl: session.url, sessionId: session.id };
  } catch (err: any) {
    // If the error was already handled during DB-persist compensation, skip incrementing attempts
    if (err && (err as any).__dbPersistHandled) {
      throw err;
    }

    // increment attempts and store error
    await prisma.outboxEvent.update({
      where: { id: event.id },
      data: { attempts: { increment: 1 }, error: String(err?.message || err) },
    });
    // if attempts exceed threshold, mark as dead-letter and notify ops
    const ev = await prisma.outboxEvent.findUnique({ where: { id: event.id } });
    if (ev && ev.attempts >= 3) {
      const reason = ev.error || String(err?.message || err);
      try {
        await prisma.$transaction(async (tx) => {
          await tx.outboxEvent.update({
            where: { id: ev.id },
            data: { deadLetter: true, deadLetterAt: new Date(), deadLetterReason: reason },
          });
          await tx.payment.update({
            where: { id: payload.paymentId },
            data: { status: "PENDING_RECONCILE", errorMessage: reason },
          });
          await tx.order.update({
            where: { id: payload.orderId },
            data: { status: "PENDING_RECONCILE" },
          });
        });
        console.info("Outbox event marked dead-letter", ev.id, "reason:", reason);
      } catch (e) {
        console.error("Failed to mark outbox/payment/order as dead-letter/PENDING_RECONCILE", e);
      }

      try {
        await sendDeadLetterNotification({
          outboxId: ev.id,
          orderId: payload.orderId,
          paymentId: payload.paymentId,
          reason,
        });
      } catch (notifyErr) {
        console.error("Failed to send dead-letter notification email", notifyErr);
      }
    }
    throw err;
  }
}
