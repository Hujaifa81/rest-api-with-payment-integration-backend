import { IJWTPayload } from "../../../interface/declare";
export declare const AuthService: {
    getNewAccessToken: (refreshToken: string) => Promise<{
        accessToken: string;
    }>;
    changePassword: (oldPassword: string, newPassword: string, decodedToken: IJWTPayload) => Promise<void>;
    resetPassword: (payload: Record<string, any>, decodedToken: IJWTPayload) => Promise<void>;
    forgotPassword: (email: string) => Promise<void>;
    setPassword: (userId: string, plainPassword: string) => Promise<void>;
};
//# sourceMappingURL=auth.service.d.ts.map