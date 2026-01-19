import { AuthProviderType, User } from "../../../../generated/prisma/client";
import { prisma } from "../../../lib/prisma";
import { ApiError } from "../../errors";
import httpStatus from "http-status-codes";
import bcryptjs from "bcryptjs";
import ENV from "../../../config/env";

const createUser = async (payload: Partial<User>) => {
  const { email, password, ...rest } = payload;

  if (!email) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email is required");
  }
  if (!password) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Password is required");
  }

  const isUserExist = await prisma.user.findUnique({
    where: { email },
  });
  if (isUserExist) {
    throw new ApiError(httpStatus.CONFLICT, "User already exists");
  }

  const hashedPassword = await bcryptjs.hash(password, Number(ENV.BCRYPT_SALT_ROUND));

  const result = await prisma.$transaction(async (tnx) => {
    const user = await tnx.user.create({
      data: {
        email,
        password: hashedPassword,
        ...rest,
      },
    });
    await tnx.authProvider.create({
      data: {
        provider: AuthProviderType.CREDENTIALS,
        providerId: email,
        userId: user.id,
      },
    });
    const userWithProviders = await tnx.user.findUnique({
      where: { id: user.id },
      include: {
        authProviders: {
          select: {
            provider: true,
            providerId: true,
          },
        },
      },
    });
    return userWithProviders;
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _pw, ...safeUser } = result || {};

  return safeUser;
};

const getMe = async (userId: string) => {
  const result = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      authProviders: {
        select: {
          provider: true,
          providerId: true,
        },
      },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _pw, ...safeUser } = result || {};

  return safeUser;
};

export const UserService = {
  createUser,
  getMe,
};
