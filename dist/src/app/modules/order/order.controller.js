import { catchAsync, sendResponse } from "../../../shared/utils/index.js";
import { prisma } from "../../../lib/prisma.js";
import { OrderService } from "./order.service.js";
import httpStatus from "http-status-codes";
const createOrder = catchAsync(async (req, res, next) => {
    const decodedToken = req.user;
    const order = await OrderService.createOrder(req.body, decodedToken);
    sendResponse(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: "Order created successfully",
        data: order,
    });
});
const createOrderWithPayLater = catchAsync(async (req, res, next) => {
    const decodedToken = req.user;
    const order = await OrderService.createOrderWithPayLater(req.body, decodedToken);
    sendResponse(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: "Order created (pay later)",
        data: order,
    });
});
const initiatePayment = catchAsync(async (req, res, next) => {
    const decodedToken = req.user;
    const orderIdRaw = req.params.orderId;
    const orderId = Array.isArray(orderIdRaw) ? orderIdRaw[0] : orderIdRaw;
    if (!orderId) {
        return sendResponse(res, {
            statusCode: httpStatus.BAD_REQUEST,
            success: false,
            message: "orderId required",
            data: null,
        });
    }
    const viaOutbox = req.body && typeof req.body.viaOutbox !== "undefined" ? Boolean(req.body.viaOutbox) : true;
    // find payment for order
    const payment = await prisma.payment.findFirst({ where: { orderId } });
    if (!payment) {
        return sendResponse(res, {
            statusCode: httpStatus.NOT_FOUND,
            success: false,
            message: "Payment not found for order",
            data: null,
        });
    }
    const result = await OrderService.initiatePayment(orderId, payment.id, {
        customerEmail: decodedToken?.email,
        viaOutbox,
    });
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Payment initiation queued",
        data: result,
    });
});
const listOrders = catchAsync(async (req, res, next) => {
    const decodedToken = req.user;
    const orders = await OrderService.listOrders(decodedToken);
    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Orders retrieved successfully",
        data: orders,
    });
});
export const OrderController = {
    createOrder,
    createOrderWithPayLater,
    initiatePayment,
    listOrders,
};
//# sourceMappingURL=order.controller.js.map