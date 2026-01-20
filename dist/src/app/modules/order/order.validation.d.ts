import { z } from "zod";
export declare const orderItemSchema: z.ZodObject<{
    productId: z.ZodUUID;
    quantity: z.ZodNumber;
}, z.core.$strip>;
export declare const createOrderZodSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        productId: z.ZodUUID;
        quantity: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
//# sourceMappingURL=order.validation.d.ts.map