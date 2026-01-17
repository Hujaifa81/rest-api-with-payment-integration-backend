/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import { catchAsync, sendResponse } from "../../../shared";
import httpStatus  from "http-status";
import { UserService } from "./user.service";

const createUser=catchAsync(async(req:Request,res:Response, next:NextFunction)=>{
    const result=await UserService.createUser(req.body);
    sendResponse(res,{
        statusCode:httpStatus.CREATED,
        success:true,
        message:"User created successfully",
        data:result,
    });
    
});

const getMe=catchAsync(async(req:Request,res:Response,next:NextFunction)=>{
    const userId=req.user?.userId as string;
    const result=await UserService.getMe(userId);
    sendResponse(res,{
        statusCode:httpStatus.OK,
        success:true,
        message:"User fetched successfully",
        data:result,
    });
});

export const UserController={
    createUser,
    getMe,
};

