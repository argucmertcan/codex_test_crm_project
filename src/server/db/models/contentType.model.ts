import { model, models, Schema, Types } from "mongoose";

import type { BaseDocument, BaseModel } from "./base.model";
import { withBaseModel } from "./base.model";

export type ContentFieldType =
  | "text"
  | "richtext"
  | "markdown"
  | "number"
  | "boolean"
  | "select"
  | "multiselect"
  | "relation"
  | "image";

export type ContentFieldRelationTarget = "entry" | "media" | "taxonomy";

export interface ContentFieldRelation {
  to: ContentFieldRelationTarget;
  multiple?: boolean;
}

export interface ContentField {
  key: string;
  label: string;
  type: ContentFieldType;
  required?: boolean;
  options?: string[];
  relation?: ContentFieldRelation;
}

export interface ContentTypeDocument extends BaseDocument {
  siteId: Types.ObjectId;
  name: string;
  apiId: string;
  description?: string | null;
  fields: ContentField[];
}

export type ContentTypeModel = BaseModel<ContentTypeDocument>;

const relationSchema = new Schema<ContentFieldRelation>(
  {
    to: { type: String, enum: ["entry", "media", "taxonomy"], required: true },
    multiple: { type: Boolean, default: false }
  },
  { _id: false }
);

const fieldSchema = new Schema<ContentField>(
  {
    key: { type: String, required: true, trim: true, lowercase: true },
    label: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ["text", "richtext", "markdown", "number", "boolean", "select", "multiselect", "relation", "image"]
    },
    required: { type: Boolean, default: false },
    options: { type: [String], default: undefined },
    relation: { type: relationSchema, default: undefined }
  },
  { _id: false }
);

const contentTypeSchema = new Schema<ContentTypeDocument, ContentTypeModel>({
  siteId: { type: Schema.Types.ObjectId, ref: "Site", required: true, index: true },
  name: { type: String, required: true, trim: true },
  apiId: { type: String, required: true, trim: true, lowercase: true },
  description: { type: String, default: null },
  fields: { type: [fieldSchema], default: [] }
});

withBaseModel(contentTypeSchema);

contentTypeSchema.index(
  { siteId: 1, apiId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

contentTypeSchema.index({ siteId: 1, name: 1 });

contentTypeSchema.path("fields").validate({
  validator(fields: ContentField[]) {
    const keys = new Set<string>();
    for (const field of fields) {
      if (keys.has(field.key)) {
        return false;
      }
      keys.add(field.key);
    }
    return true;
  },
  message: "Field keys must be unique"
});

export const ContentType =
  (models.ContentType as ContentTypeModel) ??
  model<ContentTypeDocument, ContentTypeModel>("ContentType", contentTypeSchema);
