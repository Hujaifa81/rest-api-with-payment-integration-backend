/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from "express";
import { PaymentController } from "./payment.controller";

const router = Router();

// Stripe requires the raw request body for signature verification. We
// mount express.raw for the webhook route only and copy the raw buffer
// to `req.rawBody` to keep the existing handler unchanged.

// GET /payment/:paymentId/status
router.get("/:paymentId/status", PaymentController.getPaymentStatus);

export default router;
