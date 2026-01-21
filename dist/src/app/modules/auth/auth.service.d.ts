import { IJWTPayload } from "../../../interface/declare/index.js";
export declare const AuthService: {
    getNewAccessToken: (refreshToken: string) => Promise<{
        accessToken: string;
    }>;
    changePassword: (oldPassword: string, newPassword: string, decodedToken: IJWTPayload) => Promise<void>;
};
//# sourceMappingURL=auth.service.d.ts.map