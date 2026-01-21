/* eslint-disable @typescript-eslint/no-explicit-any */

import httpStatus from "http-status-codes";
import bcryptjs from "bcryptjs";
import { createNewAccessTokenWithRefreshToken } from "../../../shared/utils/userTokens.js";
import { IJWTPayload } from "../../../interface/declare/index.js";
import { prisma } from "../../../lib/prisma.js";
import ApiError from "../../errors/ApiError.js";
import ENV from "../../../config/env.js";


const getNewAccessToken = async (refreshToken: string) => {
  const newAccessToken = await createNewAccessTokenWithRefreshToken(refreshToken);

  return {
    accessToken: newAccessToken,
  };
};

const changePassword = async (
  oldPassword: string,
  newPassword: string,
  decodedToken: IJWTPayload
) => {
  const user = await prisma.user.findUnique({
    where: { id: decodedToken.userId },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User does not exist");
  }

  const isOldPasswordMatch = await bcryptjs.compare(oldPassword, user?.password as string);

  if (!isOldPasswordMatch) {
    throw new ApiError(httpStatus.FORBIDDEN, "Old Password does not match");
  }

  user.password = await bcryptjs.hash(newPassword, Number(ENV.BCRYPT_SALT_ROUND));

  await prisma.user.update({
    where: { id: decodedToken.userId },
    data: user,
  });
};






export const AuthService = {
  getNewAccessToken,
  changePassword,
  
};
