import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status-codes";
import ApiError from "../errors/ApiError.js";
import { verifyToken } from "../../shared/helper/jwtHelper.js";
import { prisma } from "../../lib/prisma.js";
import ENV from "../../config/env.js";
import { IJWTPayload } from "../../interface/declare/index.js";


export const checkAuth =
  (...authRoles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Accept token from `Authorization` header (Bearer <token>) or cookie.
      const authHeader = (req.headers.authorization as string) || undefined;
      let accessToken = authHeader ?? req.cookies?.accessToken ?? req.cookies?.access_token;

      if (!accessToken) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "No Token Received");
      }

      // Strip leading "Bearer " if present (case-insensitive)
      if (typeof accessToken === "string" && accessToken.toLowerCase().startsWith("bearer ")) {
        accessToken = accessToken.slice(7).trim();
      }

      const verifiedToken = verifyToken(accessToken, ENV.JWT.JWT_ACCESS_SECRET) as IJWTPayload;

      const isUserExist = await prisma.user.findUnique({
        where: {
          id: verifiedToken.userId,
        },
      });

      if (!isUserExist) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "User does not exist");
      }


      if (isUserExist.isDeleted) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "User is deleted");
      }

      if (!authRoles.includes(verifiedToken.role)) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "You are not permitted to view this route!!!");
      }
      req.user = verifiedToken;
      next();
    } catch (error) {
      console.log("jwt error", error);
      next(error);
    }
  };
