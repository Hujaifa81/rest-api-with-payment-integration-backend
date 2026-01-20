import { z } from "zod";
export declare const loginZodSchema: z.ZodObject<{
    email: z.ZodEmail;
    password: z.ZodString;
}, z.core.$strip>;
export declare const changePasswordZodSchema: z.ZodObject<{
    oldPassword: z.ZodString;
    newPassword: z.ZodString;
}, z.core.$strip>;
export declare const setPasswordZodSchema: z.ZodObject<{
    password: z.ZodString;
}, z.core.$strip>;
export declare const forgotPasswordZodSchema: z.ZodObject<{
    email: z.ZodEmail;
}, z.core.$strip>;
export declare const resetPasswordZodSchema: z.ZodObject<{
    id: z.ZodString;
    newPassword: z.ZodString;
}, z.core.$strip>;
declare const _default: {
    loginZodSchema: z.ZodObject<{
        email: z.ZodEmail;
        password: z.ZodString;
    }, z.core.$strip>;
    changePasswordZodSchema: z.ZodObject<{
        oldPassword: z.ZodString;
        newPassword: z.ZodString;
    }, z.core.$strip>;
    setPasswordZodSchema: z.ZodObject<{
        password: z.ZodString;
    }, z.core.$strip>;
    forgotPasswordZodSchema: z.ZodObject<{
        email: z.ZodEmail;
    }, z.core.$strip>;
    resetPasswordZodSchema: z.ZodObject<{
        id: z.ZodString;
        newPassword: z.ZodString;
    }, z.core.$strip>;
};
export default _default;
//# sourceMappingURL=auth.validation.d.ts.map