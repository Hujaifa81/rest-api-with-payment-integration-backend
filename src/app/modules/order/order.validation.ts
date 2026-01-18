import { z } from "zod";

export const orderItemSchema = z.object({
    productId: z
        .string({ error: "Product ID must be string" })
        .uuid({ error: "Invalid product id" }),
    quantity: z
        .number({ error: "Quantity must be a number" })
        .int({ error: "Quantity must be integer" })
        .min(1, { error: "Quantity must be at least 1" }),
});

export const createOrderZodSchema = z.object({
    
    items: z
        .array(orderItemSchema, { error: "Items are required" })
        .min(1, { error: "Order must contain at least one item" }),

});




