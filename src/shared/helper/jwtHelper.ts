import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { IJWTPayload } from "../../interface/declare/index.js";


export const generateToken = (payload: IJWTPayload, secret: Secret, expiresIn: string) => {
  const token = jwt.sign(payload, secret, {
    algorithm: "HS256",
    expiresIn,
  } as SignOptions);

  return token;
};

export const verifyToken = (token: string, secret: Secret) => {
  return jwt.verify(token, secret) as IJWTPayload;
};
