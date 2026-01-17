import { ApiError } from "../../app/errors";
import ENV from "../../config";
import { IJWTPayload } from "../../interface/declare";
import { generateToken, verifyToken } from "../helper";
import httpStatus from "http-status";
import { User } from "../../../generated/prisma/client"
import { prisma } from "../../lib/prisma";


export const createUserTokens = (user: Partial<User>) => {
  const jwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  const accessToken = generateToken(
    jwtPayload as IJWTPayload,
    ENV.JWT.JWT_ACCESS_SECRET,
    ENV.JWT.JWT_ACCESS_EXPIRES
  );

  const refreshToken = generateToken(
    jwtPayload as IJWTPayload,
    ENV.JWT.JWT_REFRESH_SECRET,
    ENV.JWT.JWT_REFRESH_EXPIRES
  );

  return {
    accessToken,
    refreshToken,
  };
};

export const createNewAccessTokenWithRefreshToken = async (refreshToken: string) => {
  const verifiedRefreshToken = verifyToken(refreshToken, ENV.JWT.JWT_REFRESH_SECRET) as IJWTPayload;

  const isUserExist = await prisma.user.findUnique({
    where: {
      id: verifiedRefreshToken.userId,
    },
  });

  if (!isUserExist) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User does not exist");
  }
  
  if (isUserExist.isDeleted) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User is deleted");
  }

  const jwtPayload = {
    userId: isUserExist.id,
    email: isUserExist.email,
    role: isUserExist.role,
  };
  const accessToken = generateToken(
    jwtPayload,
    ENV.JWT.JWT_ACCESS_SECRET,
    ENV.JWT.JWT_ACCESS_EXPIRES
  );

  return accessToken;
};
