import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status-codes";
import { ApiError } from "../errors";
import { verifyToken } from "../../shared";
import ENV from "../../config/env";
import { IJWTPayload } from "../../interface/declare";
import { prisma } from "../../lib/prisma";


export const checkAuth = (...authRoles: string[]) => async (req: Request, res: Response, next: NextFunction) => {

    try {
        const accessToken = req.headers.authorization || req.cookies?.accessToken

        if (!accessToken) {
            throw new ApiError(httpStatus.UNAUTHORIZED, "No Token Recieved")
        }

        const verifiedToken = verifyToken(accessToken, ENV.JWT.JWT_ACCESS_SECRET) as IJWTPayload

        const isUserExist = await prisma.user.findUnique({
            where: {
                id: verifiedToken.userId,
            },
        });

        if (!isUserExist) {
            throw new ApiError(httpStatus.UNAUTHORIZED, "User does not exist")
        }

        if (isUserExist.isDeleted) {
            throw new ApiError(httpStatus.UNAUTHORIZED, "User is deleted")
        }

        if (!authRoles.includes(verifiedToken.role)) {
            throw new ApiError(httpStatus.UNAUTHORIZED, "You are not permitted to view this route!!!")
        }
        req.user = verifiedToken
        next()

    } catch (error) {
        console.log("jwt error", error);
        next(error)
    }
}