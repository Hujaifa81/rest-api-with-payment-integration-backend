/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from "express";
import { PaymentController } from "./payment.controller.js";

const router = Router();


router.get("/:paymentId/status", PaymentController.getPaymentStatus);

export default router;
