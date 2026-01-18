import { z } from "zod";

export const createProductZodSchema = z.object({
	name: z
		.string({ error: "Name must be string" })
		.min(1, { error: "Name is required." })
		.max(200, { error: "Name cannot exceed 200 characters." }),

	description: z
		.string({ error: "Description must be string" })
		.max(1000, { error: "Description cannot exceed 1000 characters." })
		.optional(),

	price: z
		.number({ error: "Price must be a number" })
		.nonnegative({ error: "Price must be a non-negative number." }),

	quantity: z
		.number({ error: "Quantity must be a number" })
		.int({ error: "Quantity must be an integer" })
		.nonnegative({ error: "Quantity must be >= 0" })
		.optional()
		.default(0),
});

export const updateProductZodSchema = z.object({
    name: z
        .string({ error: "Name must be string" })
        .min(1, { error: "Name is required." })
        .max(200, { error: "Name cannot exceed 200 characters." })
        .optional(),
    description: z
        .string({ error: "Description must be string" })
        .max(1000, { error: "Description cannot exceed 1000 characters." })
        .optional(),
    price: z
        .number({ error: "Price must be a number" })
        .nonnegative({ error: "Price must be a non-negative number." })
        .optional(),
    quantity: z
        .number({ error: "Quantity must be a number" })
        .int({ error: "Quantity must be an integer" })
        .nonnegative({ error: "Quantity must be >= 0" })
        .optional(),
});

