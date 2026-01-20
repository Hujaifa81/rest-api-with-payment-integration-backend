import { createNewAccessTokenWithRefreshToken } from "../../../shared";
import { ApiError } from "../../errors";
import httpStatus from "http-status-codes";
import bcryptjs from "bcryptjs";
import ENV from "../../../config/env";
import jwt from "jsonwebtoken";
import { AuthProviderType } from "../../../../generated/prisma/enums";
import { sendEmail } from "../../../shared/utils/sendEmail";
import { prisma } from "../../../lib/prisma";
const getNewAccessToken = async (refreshToken) => {
    const newAccessToken = await createNewAccessTokenWithRefreshToken(refreshToken);
    return {
        accessToken: newAccessToken,
    };
};
const changePassword = async (oldPassword, newPassword, decodedToken) => {
    const user = await prisma.user.findUnique({
        where: { id: decodedToken.userId },
    });
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User does not exist");
    }
    const isOldPasswordMatch = await bcryptjs.compare(oldPassword, user?.password);
    if (!isOldPasswordMatch) {
        throw new ApiError(httpStatus.FORBIDDEN, "Old Password does not match");
    }
    user.password = await bcryptjs.hash(newPassword, Number(ENV.BCRYPT_SALT_ROUND));
    await prisma.user.update({
        where: { id: decodedToken.userId },
        data: user,
    });
};
const resetPassword = async (payload, decodedToken) => {
    if (payload.id != decodedToken.userId) {
        throw new ApiError(httpStatus.FORBIDDEN, "You can not reset your password");
    }
    const isUserExist = await prisma.user.findUnique({
        where: { id: decodedToken.userId },
    });
    if (!isUserExist) {
        throw new ApiError(httpStatus.NOT_FOUND, "User does not exist");
    }
    const hashedPassword = await bcryptjs.hash(payload.newPassword, Number(ENV.BCRYPT_SALT_ROUND));
    isUserExist.password = hashedPassword;
    await prisma.user.update({
        where: { id: decodedToken.userId },
        data: isUserExist,
    });
};
const forgotPassword = async (email) => {
    const isUserExist = await prisma.user.findUnique({
        where: { email },
    });
    if (!isUserExist) {
        throw new ApiError(httpStatus.NOT_FOUND, "User does not exist");
    }
    if (isUserExist.isDeleted) {
        throw new ApiError(httpStatus.BAD_REQUEST, "User is deleted");
    }
    const jwtPayload = {
        userId: isUserExist.id,
        email: isUserExist.email,
        role: isUserExist.role,
    };
    const resetToken = jwt.sign(jwtPayload, ENV.JWT.JWT_ACCESS_SECRET, {
        expiresIn: "10m",
    });
    const resetUILink = `${ENV.FRONTEND_URL}/reset-password?id=${isUserExist.id}&token=${resetToken}`;
    sendEmail({
        to: isUserExist.email,
        subject: "Password Reset",
        templateName: "forgetPassword",
        templateData: {
            name: isUserExist.name,
            resetUILink,
        },
    });
};
const setPassword = async (userId, plainPassword) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            authProviders: true,
        },
    });
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }
    if (user.password &&
        user.authProviders.some((providerObject) => providerObject.provider === AuthProviderType.GOOGLE)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "You have already set you password. Now you can change the password from your profile password update");
    }
    const hashedPassword = await bcryptjs.hash(plainPassword, Number(ENV.BCRYPT_SALT_ROUND));
    await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
        await tx.authProvider.create({
            data: {
                provider: AuthProviderType.CREDENTIALS,
                providerId: user.email,
                userId: user.id,
            },
        });
    });
};
export const AuthService = {
    getNewAccessToken,
    changePassword,
    resetPassword,
    forgotPassword,
    setPassword,
};
//# sourceMappingURL=auth.service.js.map