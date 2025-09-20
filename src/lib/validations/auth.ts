import { z } from "zod";

export const credentialsSignInSchema = z.object({
  email: z.string().email({ message: "Enter a valid email" }),
  password: z.string().min(1, "Password is required")
});

export type CredentialsSignInInput = z.infer<typeof credentialsSignInSchema>;
