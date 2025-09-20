import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const siteQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  q: z.string().optional(),
  teamId: z.string().optional()
});

export const siteCreateSchema = z.object({
  name: z.string().min(2, "Name is required"),
  slug: z.string().regex(slugRegex, "Slug must be lowercase and kebab-case"),
  domain: z
    .string()
    .trim()
    .url("Domain must be a valid URL")
    .optional()
    .or(z.literal("") as z.ZodType<string | undefined>)
    .transform((value) => (value ? value : undefined)),
  locales: z.array(z.string().min(2)).min(1).optional(),
  defaultLocale: z.string().min(2).optional(),
  theme: z.string().min(2).optional(),
  teamId: z.string().optional().nullable()
});

export const siteUpdateSchema = siteCreateSchema.partial();
