import { Secret } from "jsonwebtoken";
import { IJWTPayload } from "../../interface/declare/index.js";
export declare const generateToken: (payload: IJWTPayload, secret: Secret, expiresIn: string) => string;
export declare const verifyToken: (token: string, secret: Secret) => IJWTPayload;
//# sourceMappingURL=jwtHelper.d.ts.map