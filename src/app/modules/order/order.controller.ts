/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import { catchAsync, sendResponse } from "../../../shared";
import { prisma } from "../../../lib/prisma";
import { OrderService } from "./order.service";
import { IJWTPayload } from "../../../interface/declare";
import httpStatus from "http-status-codes";

const createOrder = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const decodedToken = req.user;

  const order = await OrderService.createOrder(req.body, decodedToken as IJWTPayload);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Order created successfully",
    data: order,
  });
});

const createOrderWithPayLater = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const decodedToken = req.user;
    const order = await OrderService.createOrderWithPayLater(req.body, decodedToken as IJWTPayload);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "Order created (pay later)",
      data: order,
    });
  }
);
const initiatePayment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const decodedToken = req.user as IJWTPayload;
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
  const viaOutbox =
    req.body && typeof req.body.viaOutbox !== "undefined" ? Boolean(req.body.viaOutbox) : true;

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
    customerEmail: (decodedToken as any)?.email,
    viaOutbox,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment initiation queued",
    data: result,
  });
});

const listOrders = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const decodedToken = req.user as IJWTPayload;
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
