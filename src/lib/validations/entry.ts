import { z } from "zod";

export const entryStatusSchema = z.enum(["draft", "published", "scheduled"]);

const blockSchema = z.object({
  type: z.string().min(1),
  data: z.record(z.any()).default({}),
  meta: z.record(z.any()).optional()
});

export const entryQuerySchema = z.object({
  siteId: z.string().min(1),
  contentTypeId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  locale: z.string().optional(),
  statuses: z
    .string()
    .transform((value) =>
      value
        .split(",")
        .filter(Boolean)
        .map((status) => entryStatusSchema.parse(status as z.infer<typeof entryStatusSchema>))
    )
    .optional(),
  taxonomy: z
    .array(z.string().min(1))
    .optional()
    .default([]),
  authorId: z.string().optional(),
  publishFrom: z
    .string()
    .datetime()
    .optional()
    .transform((value) => (value ? new Date(value) : undefined)),
  publishTo: z
    .string()
    .datetime()
    .optional()
    .transform((value) => (value ? new Date(value) : undefined))
});

export const entryCreateSchema = z.object({
  siteId: z.string().min(1),
  contentTypeId: z.string().min(1),
  title: z.string().min(1),
  slug: z.string().min(1),
  status: entryStatusSchema.default("draft"),
  publishAt: z
    .string()
    .datetime()
    .optional()
    .nullable()
    .transform((value) => (value ? new Date(value) : null)),
  locale: z.string().default("en"),
  data: z.record(z.any()).optional(),
  blocks: z.array(blockSchema).optional(),
  taxonomyIds: z.array(z.string().min(1)).optional(),
  authorId: z.string().optional()
});

export const entryUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  status: entryStatusSchema.optional(),
  publishAt: z
    .string()
    .datetime()
    .nullable()
    .optional()
    .transform((value) => (value ? new Date(value) : null)),
  locale: z.string().optional(),
  data: z.record(z.any()).optional(),
  blocks: z.array(blockSchema).optional(),
  taxonomyIds: z.array(z.string().min(1)).optional(),
  authorId: z.string().optional()
});
