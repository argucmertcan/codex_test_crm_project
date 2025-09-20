import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const contentFieldTypeSchema = z.enum([
  "text",
  "richtext",
  "markdown",
  "number",
  "boolean",
  "select",
  "multiselect",
  "relation",
  "image"
]);

export const contentFieldRelationSchema = z.object({
  to: z.enum(["entry", "media", "taxonomy"]),
  multiple: z.boolean().optional()
});

export const contentFieldSchema = z
  .object({
    key: z.string().min(1).regex(slugRegex, "Field key must be lowercase kebab-case"),
    label: z.string().min(1),
    type: contentFieldTypeSchema,
    required: z.boolean().optional(),
    options: z.array(z.string().min(1)).optional(),
    relation: contentFieldRelationSchema.optional()
  })
  .superRefine((field, ctx) => {
    if ((field.type === "select" || field.type === "multiselect") && !field.options?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "Options are required for select fields"
      });
    }
    if (field.type === "relation" && !field.relation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["relation"],
        message: "Relation configuration is required"
      });
    }
  });

export const contentTypeQuerySchema = z.object({
  siteId: z.string().min(1, "siteId is required"),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional()
});

export const contentTypeCreateSchema = z.object({
  siteId: z.string().min(1),
  name: z.string().min(1),
  apiId: z.string().regex(slugRegex, "API identifier must be lowercase kebab-case"),
  description: z.string().nullable().optional(),
  fields: z.array(contentFieldSchema).default([])
});

export const contentTypeUpdateSchema = contentTypeCreateSchema.partial().extend({
  id: z.string().min(1)
});
