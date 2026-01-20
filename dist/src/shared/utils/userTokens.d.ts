import { User } from "../../../generated/prisma/client";
export declare const createUserTokens: (user: Partial<User>) => {
    accessToken: string;
    refreshToken: string;
};
export declare const createNewAccessTokenWithRefreshToken: (refreshToken: string) => Promise<string>;
//# sourceMappingURL=userTokens.d.ts.map