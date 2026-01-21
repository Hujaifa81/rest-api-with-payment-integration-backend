import httpStatus from "http-status";
import { catchAsync } from "../../../shared/utils/catchAsync.js";
import { sendResponse } from "../../../shared/utils/sendResponse.js";
import { UserService } from "./user.service.js";
const createUser = catchAsync(async (req, res, next) => {
    const result = await UserService.createUser(req.body);
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "User created successfully.",
        data: result,
    });
});
const getMe = catchAsync(async (req, res, next) => {
    const userId = (req?.user).userId;
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
//# sourceMappingURL=user.controller.js.map