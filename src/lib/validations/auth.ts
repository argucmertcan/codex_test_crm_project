import { z } from "zod";

export const credentialsSignInSchema = z.object({
  email: z.string().email({ message: "Enter a valid email" }),
  password: z.string().min(1, "Password is required")
});

export const credentialsSignUpSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required"),
    email: z.string().trim().email({ message: "Enter a valid email" }),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your password")
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

export type CredentialsSignInInput = z.infer<typeof credentialsSignInSchema>;
export type CredentialsSignUpInput = z.infer<typeof credentialsSignUpSchema>;
