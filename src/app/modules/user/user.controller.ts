/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../../shared/utils/catchAsync.js";
import { sendResponse } from "../../../shared/utils/sendResponse.js";
import { UserService } from "./user.service.js";
import { IJWTPayload } from "../../../interface/declare/index.js";


const createUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const result = await UserService.createUser(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "User created successfully.",
    data: result,
  });
});

const getMe = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req?.user as IJWTPayload).userId as string;
  const result = await UserService.getMe(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User fetched successfully",
    data: result,
  });
});

export const UserController = {
  createUser,
  getMe,
};
