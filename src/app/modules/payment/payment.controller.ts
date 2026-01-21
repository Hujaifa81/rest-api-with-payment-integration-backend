/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import { stripe } from "../../../shared/helper/stripe.js";
import ApiError  from "../../errors/ApiError.js";
import httpStatus from "http-status-codes";
import { catchAsync, sendResponse } from "../../../shared/utils/index.js";
import PaymentService from "./payment.service.js";
import ENV from "../../../config/env.js";

const stripeWebhookHandler = catchAsync(async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string | undefined;
  const webhookSecret = ENV.STRIPE.STRIPE_WEBHOOK_SECRET;
  let event: any;
  try {
    // Diagnostic logs to help debug webhook verification issues in prod
    console.debug("Stripe webhook incoming", {
      contentType: req.headers["content-type"],
      hasSignature: !!sig,
      rawLength: (req as any).rawBody ? Buffer.byteLength((req as any).rawBody) : 0,
    });

    if (!webhookSecret || !sig)
      throw new ApiError(httpStatus.BAD_REQUEST, "Missing webhook signature or secret");

    event = stripe.webhooks.constructEvent((req as any).rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed", err);
    try {
      const raw = (req as any).rawBody;
      if (raw) {
        // log a small portion to avoid very large logs
        const asStr = typeof raw === "string" ? raw : raw.toString?.() || String(raw);
        console.debug("Webhook raw body (truncated):", asStr.slice(0, 2000));
      }
    } catch (logErr) {
      console.debug("Failed to log raw body for webhook error", logErr);
    }
    return res.status(httpStatus.BAD_REQUEST).send(`Webhook Error: ${err.message}`);
  }

  await PaymentService.handleWebhookEvent(event);
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Webhook processed",
    data: { received: true },
  });
});

const getPaymentStatus = catchAsync(async (req, res) => {
  const paymentIdRaw = req.params.paymentId;
  const paymentId = Array.isArray(paymentIdRaw) ? paymentIdRaw[0] : paymentIdRaw;
  if (!paymentId)
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: "paymentId required",
      data: null,
    });

  const status = await PaymentService.getPaymentStatus(paymentId);
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment status",
    data: status,
  });
});

export const PaymentController = {
  stripeWebhookHandler,
  getPaymentStatus,
};
