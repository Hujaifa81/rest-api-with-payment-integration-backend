import { z } from "zod";

export const sendOTPSchema = z.object({
  email: z.string({ error: "Email is required" }).email({ message: "Invalid email address" }),
  name: z.string().min(1, { message: "Name is required" }).optional(),
});

export const verifyOTPSchema = z.object({
  email: z.string({ error: "Email is required" }).email({ message: "Invalid email address" }),
  otp: z
    .string({ error: "OTP is required" })
    .min(4, { message: "OTP is too short" })
    .max(8, { message: "OTP is too long" }),
});
