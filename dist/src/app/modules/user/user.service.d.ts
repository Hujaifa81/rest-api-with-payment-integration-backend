import { AuthProviderType, User } from "../../../../generated/prisma/client.js";
export declare const UserService: {
    createUser: (payload: Partial<User>) => Promise<any>;
    getMe: (userId: string) => Promise<{
        authProviders: {
            provider: AuthProviderType;
            providerId: string;
        }[];
        id: string;
        email: string;
        name: string | null;
        role: import("../../../../generated/prisma/enums.js").Role;
        isDeleted: boolean;
        createdAt: Date;
        updatedAt: Date;
    } | {}>;
};
//# sourceMappingURL=user.service.d.ts.map