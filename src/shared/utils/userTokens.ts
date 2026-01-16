import { ApiError } from "../../app/errors";
import ENV from "../../config";
import { IJWTPayload } from "../../interface/declare";
import { generateToken, verifyToken } from "../helper";
import httpStatus from "http-status";

export const createUserTokens = (user: Partial<IUser>) => {
  const jwtPayload = {
    userId: user._id,
    email: user.email,
    role: user.role,
  };
  const accessToken = generateToken(
    jwtPayload,
    ENV.JWT.JWT_ACCESS_SECRET,
    ENV.JWT.JWT_ACCESS_EXPIRES
  );

  const refreshToken = generateToken(
    jwtPayload,
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

  const isUserExist = await User.findOne({ email: verifiedRefreshToken.email });

  if (!isUserExist) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User does not exist");
  }
  if (isUserExist.isActive === IsActive.BLOCKED || isUserExist.isActive === IsActive.INACTIVE) {
    throw new ApiError(httpStatus.BAD_REQUEST, `User is ${isUserExist.isActive}`);
  }
  if (isUserExist.isDeleted) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User is deleted");
  }

  const jwtPayload = {
    userId: isUserExist._id,
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
