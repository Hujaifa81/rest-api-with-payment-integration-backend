import httpStatus from "http-status-codes";
import ApiError from "../errors/ApiError.js";
import { verifyToken } from "../../shared/helper/jwtHelper.js";
import { prisma } from "../../lib/prisma.js";
import ENV from "../../config/env.js";
export const checkAuth = (...authRoles) => async (req, res, next) => {
    try {
        const accessToken = req.headers.authorization || req.cookies?.accessToken;
        if (!accessToken) {
            throw new ApiError(httpStatus.UNAUTHORIZED, "No Token Recieved");
        }
        const verifiedToken = verifyToken(accessToken, ENV.JWT.JWT_ACCESS_SECRET);
        const isUserExist = await prisma.user.findUnique({
            where: {
                id: verifiedToken.userId,
            },
        });
        if (!isUserExist) {
            throw new ApiError(httpStatus.UNAUTHORIZED, "User does not exist");
        }
        // if (!isUserExist.isVerified) {
        //   throw new ApiError(
        //     httpStatus.UNAUTHORIZED,
        //     "User has not verified email.so first verify email"
        //   );
        // }
        if (isUserExist.isDeleted) {
            throw new ApiError(httpStatus.UNAUTHORIZED, "User is deleted");
        }
        if (!authRoles.includes(verifiedToken.role)) {
            throw new ApiError(httpStatus.UNAUTHORIZED, "You are not permitted to view this route!!!");
        }
        req.user = verifiedToken;
        next();
    }
    catch (error) {
        console.log("jwt error", error);
        next(error);
    }
};
//# sourceMappingURL=checkAuth.js.map