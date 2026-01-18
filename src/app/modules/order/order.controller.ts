import { NextFunction, Request, Response } from "express";
import { catchAsync, sendResponse } from "../../../shared";
import { OrderService } from "./order.service";
import { IJWTPayload } from "../../../interface/declare";
import httpStatus from "http-status-codes";

const createOrder=catchAsync(async(req:Request,res:Response,next:NextFunction)=>{
    const decodedToken=req.user;

    const order=await OrderService.createOrder(req.body,decodedToken as IJWTPayload);
    sendResponse(res,{
        success:true,
        statusCode:httpStatus.CREATED,
        message:"Order created successfully",
        data:order,
    });
});

export const OrderController={
    createOrder,
};