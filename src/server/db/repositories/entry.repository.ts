import type { FilterQuery, LeanDocument, UpdateQuery } from "mongoose";
import { Types } from "mongoose";

import { connectToDatabase } from "../connection";
import type { EntryBlock, EntryDocument, EntryStatus } from "../models/entry.model";
import { Entry } from "../models/entry.model";
import { applyCursorPagination, type PaginatedResult, type PaginationParams, toObjectId } from "./utils";

type ObjectIdLike = string | Types.ObjectId;

type DateRange = { from?: Date; to?: Date };

export interface CreateEntryInput {
  siteId: ObjectIdLike;
  contentTypeId: ObjectIdLike;
  slug: string;
  title: string;
  status?: EntryStatus;
  publishAt?: Date | null;
  locale?: string;
  data?: Record<string, unknown>;
  blocks?: EntryBlock[];
  authorId: ObjectIdLike;
  taxonomyIds?: ObjectIdLike[];
}

export interface UpdateEntryInput {
  title?: string;
  slug?: string;
  status?: EntryStatus;
  publishAt?: Date | null;
  locale?: string;
  data?: Record<string, unknown>;
  blocks?: EntryBlock[];
  taxonomyIds?: ObjectIdLike[];
  lastEditorId?: ObjectIdLike | null;
}

export interface ListEntriesFilters extends PaginationParams {
  siteId: ObjectIdLike;
  contentTypeId?: ObjectIdLike;
  statuses?: EntryStatus[];
  locale?: string;
  taxonomyIds?: ObjectIdLike[];
  search?: string;
  authorId?: ObjectIdLike;
  publishRange?: DateRange;
  includeDeleted?: boolean;
}

const normalizeBlocks = (blocks?: EntryBlock[]): EntryBlock[] | undefined => {
  if (!blocks) {
    return undefined;
  }
  return blocks.map((block) => ({
    type: block.type,
    data: block.data ?? {},
    meta: block.meta ?? {}
  }));
};

const normalizeTaxonomyIds = (ids?: ObjectIdLike[]): Types.ObjectId[] | undefined => {
  if (!ids) {
    return undefined;
  }
  return Array.from(new Set(ids.map((id) => toObjectId(id))));
};

const buildEntryQuery = (filters: ListEntriesFilters): FilterQuery<EntryDocument> => {
  const query: FilterQuery<EntryDocument> = {
    siteId: toObjectId(filters.siteId)
  };

  if (filters.contentTypeId) {
    query.contentTypeId = toObjectId(filters.contentTypeId);
  }

  if (filters.statuses?.length) {
    query.status = { $in: filters.statuses };
  }

  if (filters.locale) {
    query.locale = filters.locale;
  }

  if (filters.taxonomyIds?.length) {
    query.taxonomyIds = { $in: filters.taxonomyIds.map((id) => toObjectId(id)) };
  }

  if (filters.authorId) {
    query.authorId = toObjectId(filters.authorId);
  }

  if (filters.search) {
    const regex = new RegExp(filters.search.trim(), "i");
    query.$or = [{ title: regex }, { slug: regex }];
  }

  if (filters.publishRange) {
    const publishFilter: Record<string, Date> = {};
    if (filters.publishRange.from) {
      publishFilter.$gte = filters.publishRange.from;
    }
    if (filters.publishRange.to) {
      publishFilter.$lte = filters.publishRange.to;
    }
    if (Object.keys(publishFilter).length) {
      query.publishAt = publishFilter;
    }
  }

  return query;
};

export const entryRepository = {
  async create(input: CreateEntryInput, actorId?: ObjectIdLike): Promise<LeanDocument<EntryDocument>> {
    await connectToDatabase();

    const entry = await Entry.create({
      ...input,
      siteId: toObjectId(input.siteId),
      contentTypeId: toObjectId(input.contentTypeId),
      slug: input.slug.toLowerCase(),
      status: input.status ?? "draft",
      publishAt: input.publishAt ?? null,
      locale: input.locale ?? "en",
      data: input.data ?? {},
      blocks: normalizeBlocks(input.blocks) ?? [],
      authorId: toObjectId(input.authorId),
      taxonomyIds: normalizeTaxonomyIds(input.taxonomyIds) ?? [],
      createdBy: actorId ? toObjectId(actorId) : undefined,
      updatedBy: actorId ? toObjectId(actorId) : undefined,
      lastEditorId: actorId ? toObjectId(actorId) : undefined
    });

    return entry.toObject();
  },

  async update(
    id: ObjectIdLike,
    updates: UpdateEntryInput,
    actorId?: ObjectIdLike
  ): Promise<LeanDocument<EntryDocument> | null> {
    await connectToDatabase();

    const updatePayload: UpdateQuery<EntryDocument> = {
      ...updates,
      slug: updates.slug ? updates.slug.toLowerCase() : undefined,
      blocks: normalizeBlocks(updates.blocks),
      taxonomyIds: normalizeTaxonomyIds(updates.taxonomyIds),
      updatedBy: actorId ? toObjectId(actorId) : undefined,
      lastEditorId: updates.lastEditorId
        ? toObjectId(updates.lastEditorId)
        : updates.lastEditorId === null
          ? null
          : actorId
            ? toObjectId(actorId)
            : undefined
    };

    const doc = await Entry.findOneAndUpdate(
      { _id: toObjectId(id) },
      updatePayload,
      { new: true, runValidators: true }
    );

    return doc ? doc.toObject() : null;
  },

  async findById(
    id: ObjectIdLike,
    options: { includeDeleted?: boolean } = {}
  ): Promise<LeanDocument<EntryDocument> | null> {
    await connectToDatabase();
    const query = Entry.findById(toObjectId(id));
    if (options.includeDeleted) {
      query.setOptions({ includeDeleted: true });
    }
    return query.lean();
  },

  async findBySlug(
    siteId: ObjectIdLike,
    slug: string,
    locale: string,
    options: { includeDeleted?: boolean } = {}
  ): Promise<LeanDocument<EntryDocument> | null> {
    await connectToDatabase();
    const query = Entry.findOne({
      siteId: toObjectId(siteId),
      slug: slug.toLowerCase(),
      locale
    });
    if (options.includeDeleted) {
      query.setOptions({ includeDeleted: true });
    }
    return query.lean();
  },

  async list(filters: ListEntriesFilters): Promise<PaginatedResult<LeanDocument<EntryDocument>>> {
    await connectToDatabase();
    const query = Entry.find(buildEntryQuery(filters));
    if (filters.includeDeleted) {
      query.setOptions({ includeDeleted: true });
    }
    return applyCursorPagination(query, filters);
  },

  async countByStatus(siteId: ObjectIdLike): Promise<Record<EntryStatus, number>> {
    await connectToDatabase();
    const pipeline = [
      { $match: { siteId: toObjectId(siteId), isDeleted: false } },
      {
        $group: {
          _id: "$status",
          total: { $sum: 1 }
        }
      }
    ];

    const results = await Entry.aggregate<{ _id: EntryStatus; total: number }>(pipeline);
    return results.reduce(
      (acc, item) => {
        acc[item._id] = item.total;
        return acc;
      },
      { draft: 0, published: 0, scheduled: 0 } as Record<EntryStatus, number>
    );
  },

  async softDelete(id: ObjectIdLike, actorId?: ObjectIdLike): Promise<void> {
    await connectToDatabase();
    const doc = await Entry.findById(toObjectId(id)).setOptions({ includeDeleted: true });
    if (!doc) {
      return;
    }
    await doc.softDelete(actorId ? toObjectId(actorId) : undefined);
  },

  async restore(id: ObjectIdLike, actorId?: ObjectIdLike): Promise<void> {
    await connectToDatabase();
    const doc = await Entry.findById(toObjectId(id)).setOptions({ includeDeleted: true });
    if (!doc) {
      return;
    }
    await doc.restore(actorId ? toObjectId(actorId) : undefined);
  }
};
