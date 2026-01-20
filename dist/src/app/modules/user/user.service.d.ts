import { AuthProviderType, User } from "../../../../generated/prisma/client";
export declare const UserService: {
    createUser: (payload: Partial<User>) => Promise<{
        authProviders: {
            provider: AuthProviderType;
            providerId: string;
        }[];
        name: string | null;
        id: string;
        email: string;
        isVerified: boolean;
        role: import("../../../../generated/prisma/enums").Role;
        isDeleted: boolean;
        createdAt: Date;
        updatedAt: Date;
    } | {}>;
    getMe: (userId: string) => Promise<{
        authProviders: {
            provider: AuthProviderType;
            providerId: string;
        }[];
        name: string | null;
        id: string;
        email: string;
        isVerified: boolean;
        role: import("../../../../generated/prisma/enums").Role;
        isDeleted: boolean;
        createdAt: Date;
        updatedAt: Date;
    } | {}>;
};
//# sourceMappingURL=user.service.d.ts.map