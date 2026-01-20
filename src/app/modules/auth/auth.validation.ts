import { z } from "zod";

export const loginZodSchema = z.object({
  email: z.email({ message: "Please provide a valid email address." }),
  password: z.string().min(1, { message: "Password must be required." }),
});

export const changePasswordZodSchema = z
  .object({
    oldPassword: z.string().min(1, { message: "Old password is required." }),
    newPassword: z
      .string({ error: "Password must be string" })
      .min(8, { error: "Password must be at least 8 characters long." })
      .regex(/^(?=.*[A-Z])/, {
        error: "Password must contain at least 1 uppercase letter.",
      })
      .regex(/^(?=.*[a-z])/, {
        error: "Password must contain at least 1 lowercase letter.",
      })
      .regex(/^(?=.*[!@#$%^&*])/, {
        error: "Password must contain at least 1 special character.",
      })
      .regex(/^(?=.*\d)/, {
        error: "Password must contain at least 1 number.",
      }),
  })
  .refine((data) => data.oldPassword !== data.newPassword, {
    message: "New password must be different from the old password.",
    path: ["newPassword"],
  });

export const setPasswordZodSchema = z.object({
  password: z
    .string({ error: "Password must be string" })
    .min(8, { error: "Password must be at least 8 characters long." })
    .regex(/^(?=.*[A-Z])/, {
      error: "Password must contain at least 1 uppercase letter.",
    })
    .regex(/^(?=.*[a-z])/, {
      error: "Password must contain at least 1 lowercase letter.",
    })
    .regex(/^(?=.*[!@#$%^&*])/, {
      error: "Password must contain at least 1 special character.",
    })
    .regex(/^(?=.*\d)/, {
      error: "Password must contain at least 1 number.",
    }),
});

export const forgotPasswordZodSchema = z.object({
  email: z.email({ message: "Please provide a valid email address." }),
});

export const resetPasswordZodSchema = z.object({
  id: z.string().nonempty({ message: "User id is required." }),
  newPassword: z
    .string({ error: "Password must be string" })
    .min(8, { error: "Password must be at least 8 characters long." })
    .regex(/^(?=.*[A-Z])/, {
      error: "Password must contain at least 1 uppercase letter.",
    })
    .regex(/^(?=.*[a-z])/, {
      error: "Password must contain at least 1 lowercase letter.",
    })
    .regex(/^(?=.*[!@#$%^&*])/, {
      error: "Password must contain at least 1 special character.",
    })
    .regex(/^(?=.*\d)/, {
      error: "Password must contain at least 1 number.",
    }),
});

export default {
  loginZodSchema,
  changePasswordZodSchema,
  setPasswordZodSchema,
  forgotPasswordZodSchema,
  resetPasswordZodSchema,
};
