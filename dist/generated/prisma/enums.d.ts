export declare const Role: {
    readonly USER: "USER";
};
export type Role = (typeof Role)[keyof typeof Role];
export declare const AuthProviderType: {
    readonly GOOGLE: "GOOGLE";
    readonly CREDENTIALS: "CREDENTIALS";
};
export type AuthProviderType = (typeof AuthProviderType)[keyof typeof AuthProviderType];
export declare const PaymentStatus: {
    readonly UNPAID: "UNPAID";
    readonly PENDING_RECONCILE: "PENDING_RECONCILE";
    readonly FAILED: "FAILED";
    readonly PAID: "PAID";
    readonly CANCELED: "CANCELED";
};
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];
//# sourceMappingURL=enums.d.ts.map