// src/modules/otp/otp.routes.ts
import express from "express";
import { OTPController } from "./otp.controller";
import validateRequest from "../../middlewares/validateRequest";
import { sendOTPSchema, verifyOTPSchema } from "./otp.validation";
const router = express.Router();
router.post("/send", validateRequest(sendOTPSchema), OTPController.sendOTP);
router.post("/verify", validateRequest(verifyOTPSchema), OTPController.verifyOTP);
export default router;
//# sourceMappingURL=otp.route.js.map