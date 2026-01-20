import { catchAsync, sendResponse } from "../../../shared";
import httpStatus from "http-status";
import { UserService } from "./user.service";
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
    const userId = req.user?.userId;
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