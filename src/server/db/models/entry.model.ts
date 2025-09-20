import { model, models, Schema, Types } from "mongoose";

import type { BaseDocument, BaseModel } from "./base.model";
import { withBaseModel } from "./base.model";

export type EntryStatus = "draft" | "published" | "scheduled";

export interface EntryBlock {
  type: string;
  data: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export interface EntryDocument extends BaseDocument {
  siteId: Types.ObjectId;
  contentTypeId: Types.ObjectId;
  slug: string;
  title: string;
  status: EntryStatus;
  publishAt?: Date | null;
  locale: string;
  data: Record<string, unknown>;
  blocks: EntryBlock[];
  authorId: Types.ObjectId;
  lastEditorId?: Types.ObjectId | null;
  taxonomyIds: Types.ObjectId[];
  revisionId?: Types.ObjectId | null;
}

export type EntryModel = BaseModel<EntryDocument>;

const blockSchema = new Schema<EntryBlock>(
  {
    type: { type: String, required: true },
    data: { type: Schema.Types.Mixed, required: true, default: {} },
    meta: { type: Schema.Types.Mixed, default: {} }
  },
  { _id: false }
);

const entrySchema = new Schema<EntryDocument, EntryModel>({
  siteId: { type: Schema.Types.ObjectId, ref: "Site", required: true, index: true },
  contentTypeId: { type: Schema.Types.ObjectId, ref: "ContentType", required: true, index: true },
  slug: { type: String, required: true, trim: true, lowercase: true },
  title: { type: String, required: true, trim: true },
  status: { type: String, enum: ["draft", "published", "scheduled"], default: "draft", index: true },
  publishAt: { type: Date, default: null, index: true },
  locale: { type: String, required: true, default: "en", index: true },
  data: { type: Schema.Types.Mixed, default: {} },
  blocks: { type: [blockSchema], default: [] },
  authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  lastEditorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  taxonomyIds: { type: [Schema.Types.ObjectId], ref: "Taxonomy", default: [], index: true },
  revisionId: { type: Schema.Types.ObjectId, ref: "Revision", default: null }
});

withBaseModel(entrySchema);

entrySchema.index(
  { siteId: 1, slug: 1, locale: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

entrySchema.index({ siteId: 1, status: 1, publishAt: 1 });
entrySchema.index({ contentTypeId: 1, status: 1 });
entrySchema.index({ siteId: 1, createdAt: -1 });

entrySchema.path("slug").validate({
  validator(value: string) {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
  },
  message: "Slug must be kebab-case and contain only alphanumeric characters"
});

export const Entry = (models.Entry as EntryModel) ?? model<EntryDocument, EntryModel>("Entry", entrySchema);
