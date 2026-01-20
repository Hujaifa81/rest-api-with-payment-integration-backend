// src/modules/otp/otp.routes.ts
import express from "express";
import { OTPController } from "./otp.controller.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { sendOTPSchema, verifyOTPSchema } from "./otp.validation.js";

const router = express.Router();

router.post("/send", validateRequest(sendOTPSchema), OTPController.sendOTP);
router.post("/verify", validateRequest(verifyOTPSchema), OTPController.verifyOTP);

export default router;
