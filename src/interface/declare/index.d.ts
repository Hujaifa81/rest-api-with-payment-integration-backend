import { JwtPayload } from "jsonwebtoken";

export interface IJWTPayload extends JwtPayload {
  userId: string;
  email: string;
  role: USER;
}

declare global {
  namespace Express {
    interface Request {
      user: IJWTPayload;
    }
  }
}
