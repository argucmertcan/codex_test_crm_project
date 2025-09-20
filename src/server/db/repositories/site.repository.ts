import type { FilterQuery, LeanDocument, UpdateQuery } from "mongoose";
import { Types } from "mongoose";

import { connectToDatabase } from "../connection";
import type { SiteDocument } from "../models/site.model";
import { Site } from "../models/site.model";
import { applyCursorPagination, type PaginatedResult, type PaginationParams, toObjectId } from "./utils";

type ObjectIdLike = string | Types.ObjectId;

export interface CreateSiteInput {
  name: string;
  slug: string;
  domain?: string | null;
  locales?: string[];
  defaultLocale?: string;
  theme?: string;
  teamId?: ObjectIdLike | null;
}

export interface UpdateSiteInput {
  name?: string;
  domain?: string | null;
  locales?: string[];
  defaultLocale?: string;
  theme?: string;
  teamId?: ObjectIdLike | null;
}

export interface ListSitesFilters extends PaginationParams {
  search?: string;
  teamId?: ObjectIdLike | null;
  includeDeleted?: boolean;
}

const buildSiteQuery = (filters: ListSitesFilters): FilterQuery<SiteDocument> => {
  const query: FilterQuery<SiteDocument> = {};

  if (filters.teamId) {
    query.teamId = toObjectId(filters.teamId);
  }

  if (filters.search) {
    const regex = new RegExp(filters.search.trim(), "i");
    query.$or = [{ name: regex }, { slug: regex }, { domain: regex }];
  }

  return query;
};

const normalizeLocales = (locales?: string[]): string[] | undefined => {
  if (!locales) {
    return undefined;
  }
  const unique = Array.from(new Set(locales.map((locale) => locale.toLowerCase())));
  return unique.length ? unique : undefined;
};

export const siteRepository = {
  async create(input: CreateSiteInput, actorId?: ObjectIdLike): Promise<LeanDocument<SiteDocument>> {
    await connectToDatabase();

    const locales = normalizeLocales(input.locales);
    const defaultLocale = input.defaultLocale ?? locales?.[0] ?? "en";

    const site = await Site.create({
      ...input,
      locales: locales ?? undefined,
      defaultLocale,
      teamId: input.teamId ? toObjectId(input.teamId) : null,
      createdBy: actorId ? toObjectId(actorId) : undefined,
      updatedBy: actorId ? toObjectId(actorId) : undefined
    });

    return site.toObject();
  },

  async update(
    id: ObjectIdLike,
    updates: UpdateSiteInput,
    actorId?: ObjectIdLike
  ): Promise<LeanDocument<SiteDocument> | null> {
    await connectToDatabase();

    const locales = normalizeLocales(updates.locales);
    const updatePayload: UpdateQuery<SiteDocument> = {
      ...updates,
      locales,
      teamId: updates.teamId ? toObjectId(updates.teamId) : updates.teamId === null ? null : undefined,
      updatedBy: actorId ? toObjectId(actorId) : undefined
    };

    const doc = await Site.findOneAndUpdate(
      { _id: toObjectId(id) },
      updatePayload,
      { new: true, runValidators: true }
    );

    return doc ? doc.toObject() : null;
  },

  async findById(
    id: ObjectIdLike,
    options: { includeDeleted?: boolean } = {}
  ): Promise<LeanDocument<SiteDocument> | null> {
    await connectToDatabase();
    const query = Site.findById(toObjectId(id));
    if (options.includeDeleted) {
      query.setOptions({ includeDeleted: true });
    }
    return query.lean();
  },

  async findBySlug(slug: string, options: { includeDeleted?: boolean } = {}): Promise<LeanDocument<SiteDocument> | null> {
    await connectToDatabase();
    const query = Site.findOne({ slug: slug.toLowerCase() });
    if (options.includeDeleted) {
      query.setOptions({ includeDeleted: true });
    }
    return query.lean();
  },

  async list(filters: ListSitesFilters): Promise<PaginatedResult<LeanDocument<SiteDocument>>> {
    await connectToDatabase();
    const query = Site.find(buildSiteQuery(filters));
    if (filters.includeDeleted) {
      query.setOptions({ includeDeleted: true });
    }
    return applyCursorPagination(query, filters);
  },

  async softDelete(id: ObjectIdLike, actorId?: ObjectIdLike): Promise<void> {
    await connectToDatabase();
    const doc = await Site.findById(toObjectId(id)).setOptions({ includeDeleted: true });
    if (!doc) {
      return;
    }
    await doc.softDelete(actorId ? toObjectId(actorId) : undefined);
  },

  async restore(id: ObjectIdLike, actorId?: ObjectIdLike): Promise<void> {
    await connectToDatabase();
    const doc = await Site.findById(toObjectId(id)).setOptions({ includeDeleted: true });
    if (!doc) {
      return;
    }
    await doc.restore(actorId ? toObjectId(actorId) : undefined);
  }
};
