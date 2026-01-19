import { z } from "zod";
import Decimal from "decimal.js";

export const createProductZodSchema = z.object({
  name: z
    .string({ error: "Name must be string" })
    .min(1, { error: "Name is required." })
    .max(200, { error: "Name cannot exceed 200 characters." }),

  description: z
    .string({ error: "Description must be string" })
    .max(1000, { error: "Description cannot exceed 1000 characters." })
    .optional(),

  price: z.union([z.string(), z.number()]).refine(
    (v) => {
      try {
        const dec = new Decimal(typeof v === "string" ? v.trim() : v);
        return !dec.isNegative();
      } catch {
        return false;
      }
    },
    { message: "Price must be a non-negative number" }
  ),

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
    .union([z.string(), z.number()])
    .refine(
      (v) => {
        try {
          const dec = new Decimal(typeof v === "string" ? v.trim() : v);
          return !dec.isNegative();
        } catch {
          return false;
        }
      },
      { message: "Price must be a non-negative number" }
    )
    .optional(),
  quantity: z
    .number({ error: "Quantity must be a number" })
    .int({ error: "Quantity must be an integer" })
    .nonnegative({ error: "Quantity must be >= 0" })
    .optional(),
});
