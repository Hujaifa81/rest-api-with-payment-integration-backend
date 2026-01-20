import { z } from "zod";
export declare const createProductZodSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    price: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    quantity: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export declare const updateProductZodSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    price: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
    quantity: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
//# sourceMappingURL=product.validation.d.ts.map