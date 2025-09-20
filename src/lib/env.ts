import { z } from "zod";

const DEV_AUTH_SECRET = "development-secret-development-secret";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_NAME: z.string().default("Nebula CMS"),
    APP_URL: z.string().url().default("http://localhost:3000"),
    NEXTAUTH_URL: z.string().url().optional(),
    NEXTAUTH_SECRET: z.string().min(32).optional(),
    MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM_EMAIL: z.string().email().optional(),
    STORAGE_PROVIDER: z.enum(["local", "s3", "r2"]).default("local"),
    STORAGE_BUCKET: z.string().min(1).optional(),
    STORAGE_ENDPOINT: z.string().url().optional(),
    STORAGE_ACCESS_KEY: z.string().optional(),
    STORAGE_SECRET_KEY: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    RATE_LIMIT_WINDOW: z.coerce.number().int().positive().default(60),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60)
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production") {
      if (!env.NEXTAUTH_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["NEXTAUTH_SECRET"],
          message: "NEXTAUTH_SECRET is required in production"
        });
      }
      if (!env.NEXTAUTH_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["NEXTAUTH_URL"],
          message: "NEXTAUTH_URL is required in production"
        });
      }
      if (!env.RESEND_API_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["RESEND_API_KEY"],
          message: "RESEND_API_KEY is required in production"
        });
      }
    }

    if (env.STORAGE_PROVIDER !== "local") {
      if (!env.STORAGE_BUCKET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["STORAGE_BUCKET"],
          message: "STORAGE_BUCKET is required for remote storage"
        });
      }
      if (!env.STORAGE_ACCESS_KEY || !env.STORAGE_SECRET_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["STORAGE_ACCESS_KEY"],
          message: "STORAGE_ACCESS_KEY and STORAGE_SECRET_KEY are required for remote storage"
        });
      }
      if (env.STORAGE_PROVIDER === "r2" && !env.STORAGE_ENDPOINT) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["STORAGE_ENDPOINT"],
          message: "STORAGE_ENDPOINT is required for R2"
        });
      }
    }
  })
  .transform((env) => ({
    ...env,
    NEXTAUTH_SECRET: env.NEXTAUTH_SECRET ?? DEV_AUTH_SECRET,
    NEXTAUTH_URL: env.NEXTAUTH_URL ?? env.APP_URL
  }));

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment configuration", parsedEnv.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = Object.freeze(parsedEnv.data);
export type Env = typeof env;

export const isDevelopment = env.NODE_ENV === "development";
export const isTest = env.NODE_ENV === "test";
export const isProduction = env.NODE_ENV === "production";
