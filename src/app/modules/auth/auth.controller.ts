/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import passport from "passport";

import { Request, Response, NextFunction } from "express";
import httpStatus from "http-status-codes";
import ApiError from "../../errors/ApiError.js";
import { catchAsync } from "../../../shared/utils/catchAsync.js";
import { createUserTokens } from "../../../shared/utils/userTokens.js";
import { setAuthCookie } from "../../../shared/utils/setCookie.js";
import { sendResponse } from "../../../shared/utils/sendResponse.js";
import { AuthService } from "./auth.service.js";
import ENV from "../../../config/env.js";
import { IJWTPayload } from "../../../interface/declare/index.js";


const credentialsLogin = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate("local", async (err: any, user: any, info: any) => {
    if (err) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, err));
    }

    if (!user) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, info.message));
    }

    const userTokens = await createUserTokens(user);

    const { password: pass, ...rest } = user as any;

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

const googleCallbackController = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    let redirectTo = req.query.state ? (req.query.state as string) : "";

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
  }
);

const getNewAccessToken = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No refresh token recieved from cookies");
  }
  const tokenInfo = await AuthService.getNewAccessToken(refreshToken as string);

  setAuthCookie(res, tokenInfo);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "New Access Token Retrived Successfully",
    data: tokenInfo,
  });
});

const changePassword = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const newPassword = req.body.newPassword;
  const oldPassword = req.body.oldPassword;
  const decodedToken = req.user;

  await AuthService.changePassword(oldPassword, newPassword, decodedToken as IJWTPayload);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Password Changed Successfully",
    data: null,
  });
});

const logout = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const cookieOptions = {
    httpOnly: true,
    secure: ENV.NODE_ENV === "production",
    sameSite: ENV.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  } as const;

  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "User Logged Out Successfully",
    data: null,
  });
});





export const AuthController = {
  credentialsLogin,
  googleCallbackController,
  getNewAccessToken,
  changePassword,
  logout,
};
