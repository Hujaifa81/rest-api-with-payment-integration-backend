/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import passport from "passport";
import ENV from "../../../config/env";
import { catchAsync, createUserTokens, sendResponse, setAuthCookie } from "../../../shared";
import { ApiError } from "../../errors";
import { AuthService } from "./auth.service";
import httpStatus from "http-status-codes";
const credentialsLogin = catchAsync(async (req, res, next) => {
    passport.authenticate("local", async (err, user, info) => {
        if (err) {
            return next(new ApiError(httpStatus.UNAUTHORIZED, err));
        }
        if (!user) {
            return next(new ApiError(httpStatus.UNAUTHORIZED, info.message));
        }
        const userTokens = await createUserTokens(user);
        // `user` is a plain object from Prisma; no `toObject()` method.
        const { password: pass, ...rest } = user;
        setAuthCookie(res, userTokens);
        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "User Logged In Successfully",
            data: {
                accessToken: userTokens.accessToken,
                refreshToken: userTokens.refreshToken,
                user: rest,
            },
        });
    })(req, res, next);
});
const googleCallbackController = catchAsync(async (req, res, next) => {
    let redirectTo = req.query.state ? req.query.state : "";
    if (redirectTo.startsWith("/")) {
        redirectTo = redirectTo.slice(1);
    }
    const user = req.user;
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User Not Found");
    }
    const tokenInfo = createUserTokens(user);
    setAuthCookie(res, tokenInfo);
    res.redirect(`${ENV.FRONTEND_URL}/${redirectTo}`);
});
const getNewAccessToken = catchAsync(async (req, res, next) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        throw new ApiError(httpStatus.BAD_REQUEST, "No refresh token recieved from cookies");
    }
    const tokenInfo = await AuthService.getNewAccessToken(refreshToken);
    setAuthCookie(res, tokenInfo);
    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "New Access Token Retrived Successfully",
        data: tokenInfo,
    });
});
const changePassword = catchAsync(async (req, res, next) => {
    const newPassword = req.body.newPassword;
    const oldPassword = req.body.oldPassword;
    const decodedToken = req.user;
    await AuthService.changePassword(oldPassword, newPassword, decodedToken);
    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Password Changed Successfully",
        data: null,
    });
});
const logout = catchAsync(async (req, res, next) => {
    const cookieOptions = {
        httpOnly: true,
        secure: ENV.NODE_ENV === "production",
        sameSite: ENV.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
    };
    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);
    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "User Logged Out Successfully",
        data: null,
    });
});
const resetPassword = catchAsync(async (req, res, next) => {
    const decodedToken = req.user;
    await AuthService.resetPassword(req.body, decodedToken);
    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Password Changed Successfully",
        data: null,
    });
});
const forgotPassword = catchAsync(async (req, res, next) => {
    const { email } = req.body;
    await AuthService.forgotPassword(email);
    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Email Sent Successfully",
        data: null,
    });
});
const setPassword = catchAsync(async (req, res, next) => {
    const decodedToken = req.user;
    const { password } = req.body;
    await AuthService.setPassword(decodedToken.userId, password);
    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Password Changed Successfully",
        data: null,
    });
});
export const AuthController = {
    credentialsLogin,
    googleCallbackController,
    getNewAccessToken,
    changePassword,
    logout,
    resetPassword,
    forgotPassword,
    setPassword,
};
//# sourceMappingURL=auth.controller.js.map