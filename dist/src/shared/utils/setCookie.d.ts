import { Response } from "express";
export interface AuthTokens {
    accessToken?: string;
    refreshToken?: string;
}
export declare const setAuthCookie: (res: Response, tokenInfo: AuthTokens) => void;
//# sourceMappingURL=setCookie.d.ts.map