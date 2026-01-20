import { catchAsync, sendResponse } from "../../../shared";
import { OTPService } from "./otp.service";
const sendOTP = catchAsync(async (req, res) => {
    const { email, name } = req.body;
    await OTPService.sendOTP(email, name);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "OTP sent successfully",
        data: null,
    });
});
const verifyOTP = catchAsync(async (req, res) => {
    const { email, otp } = req.body;
    await OTPService.verifyOTP(email, otp);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "OTP verified successfully",
        data: null,
    });
});
export const OTPController = {
    sendOTP,
    verifyOTP,
};
//# sourceMappingURL=otp.controller.js.map