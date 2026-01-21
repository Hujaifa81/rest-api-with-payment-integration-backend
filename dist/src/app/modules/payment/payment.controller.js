import { stripe } from "../../../shared/helper/stripe.js";
import ApiError from "../../errors/ApiError.js";
import httpStatus from "http-status-codes";
import { catchAsync, sendResponse } from "../../../shared/utils/index.js";
import PaymentService from "./payment.service.js";
import ENV from "../../../config/env.js";
const stripeWebhookHandler = catchAsync(async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = ENV.STRIPE.STRIPE_WEBHOOK_SECRET;
    let event;
    try {
        if (!webhookSecret || !sig)
            throw new ApiError(httpStatus.BAD_REQUEST, "Missing webhook signature or secret");
        event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    }
    catch (err) {
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
//# sourceMappingURL=payment.controller.js.map