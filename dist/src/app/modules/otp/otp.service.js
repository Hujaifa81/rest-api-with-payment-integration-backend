import crypto from "crypto";
import { prisma } from "../../../lib/prisma";
import { ApiError } from "../../errors";
import { redisClient } from "../../../config/redis";
import httpsStatus from "http-status-codes";
import { sendEmail } from "../../../shared/utils/sendEmail";
const OTP_EXPIRATION = 2 * 60; // 2minute
const generateOtp = (length = 6) => {
    const otp = crypto.randomInt(10 ** (length - 1), 10 ** length).toString();
    return otp;
};
const sendOTP = async (email, name) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        throw new ApiError(httpsStatus.NOT_FOUND, "User not found");
    }
    if (user.isVerified) {
        throw new ApiError(401, "You are already verified");
    }
    const otp = generateOtp();
    const redisKey = `otp:${email}`;
    await redisClient.set(redisKey, otp, {
        expiration: {
            type: "EX",
            value: OTP_EXPIRATION,
        },
    });
    await sendEmail({
        to: email,
        subject: "Your OTP Code",
        templateName: "otp",
        templateData: {
            name: name,
            otp: otp,
        },
    });
};
const verifyOTP = async (email, otp) => {
    const user = await prisma.user.findFirst({ where: { email, isVerified: false } });
    if (!user) {
        throw new ApiError(httpsStatus.NOT_FOUND, "User not found");
    }
    if (user.isVerified) {
        throw new ApiError(httpsStatus.BAD_REQUEST, "You are already verified");
    }
    const redisKey = `otp:${email}`;
    const savedOtp = await redisClient.get(redisKey);
    if (!savedOtp) {
        throw new ApiError(httpsStatus.BAD_REQUEST, "Invalid OTP");
    }
    if (savedOtp !== otp) {
        throw new ApiError(httpsStatus.BAD_REQUEST, "Invalid OTP");
    }
    await Promise.all([
        prisma.user.update({
            where: { email },
            data: { isVerified: true },
        }),
        redisClient.del([redisKey]),
    ]);
};
export const OTPService = {
    sendOTP,
    verifyOTP,
};
//# sourceMappingURL=otp.service.js.map