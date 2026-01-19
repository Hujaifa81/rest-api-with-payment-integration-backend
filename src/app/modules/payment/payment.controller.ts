/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import { stripe } from "../../../shared/helper/stripe";
import { ApiError } from "../../errors";
import httpStatus from "http-status-codes";
import { catchAsync, sendResponse } from "../../../shared";
import PaymentService from "./payment.service";

const stripeWebhookHandler = catchAsync(async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string | undefined;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event: any;
  try {
    if (!webhookSecret || !sig)
      throw new ApiError(httpStatus.BAD_REQUEST, "Missing webhook signature or secret");
    event = stripe.webhooks.constructEvent((req as any).rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed", err);
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
