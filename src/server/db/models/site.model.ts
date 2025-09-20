import { model, models, Schema, Types } from "mongoose";

import type { BaseDocument, BaseModel } from "./base.model";
import { withBaseModel } from "./base.model";

export interface Site extends BaseDocument {
  name: string;
  slug: string;
  domain?: string | null;
  locales: string[];
  defaultLocale: string;
  theme: string;
  teamId?: Types.ObjectId | null;
}

export type SiteDocument = Site;
export type SiteModel = BaseModel<SiteDocument>;

const siteSchema = new Schema<SiteDocument, SiteModel>({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true, lowercase: true },
  domain: { type: String, default: null },
  locales: {
    type: [String],
    default: ["en"],
    validate: [
      (locales: string[]) => locales.length > 0,
      "At least one locale is required"
    ]
  },
  defaultLocale: { type: String, required: true, default: "en" },
  theme: { type: String, required: true, default: "system" },
  teamId: { type: Schema.Types.ObjectId, ref: "Team", default: null, index: true }
});

withBaseModel(siteSchema);

siteSchema.index(
  { slug: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

siteSchema.index({ domain: 1 }, { unique: true, sparse: true });

siteSchema.path("defaultLocale").validate({
  validator(this: SiteDocument, value: string) {
    return this.locales.includes(value);
  },
  message: "Default locale must be part of the locales list"
});

export const Site = (models.Site as SiteModel) ?? model<SiteDocument, SiteModel>("Site", siteSchema);
