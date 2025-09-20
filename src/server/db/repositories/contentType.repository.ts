import type { FilterQuery, LeanDocument, UpdateQuery } from "mongoose";
import { Types } from "mongoose";

import { connectToDatabase } from "../connection";
import type { ContentField, ContentTypeDocument } from "../models/contentType.model";
import { ContentType } from "../models/contentType.model";
import { applyCursorPagination, type PaginatedResult, type PaginationParams, toObjectId } from "./utils";

type ObjectIdLike = string | Types.ObjectId;

export interface CreateContentTypeInput {
  siteId: ObjectIdLike;
  name: string;
  apiId: string;
  description?: string | null;
  fields?: ContentField[];
}

export interface UpdateContentTypeInput {
  name?: string;
  description?: string | null;
  fields?: ContentField[];
}

export interface ListContentTypesFilters extends PaginationParams {
  siteId: ObjectIdLike;
  search?: string;
  includeDeleted?: boolean;
}

const buildContentTypeQuery = (filters: ListContentTypesFilters): FilterQuery<ContentTypeDocument> => {
  const query: FilterQuery<ContentTypeDocument> = {
    siteId: toObjectId(filters.siteId)
  };

  if (filters.search) {
    const regex = new RegExp(filters.search.trim(), "i");
    query.$or = [{ name: regex }, { apiId: regex }];
  }

  return query;
};

export const contentTypeRepository = {
  async create(
    input: CreateContentTypeInput,
    actorId?: ObjectIdLike
  ): Promise<LeanDocument<ContentTypeDocument>> {
    await connectToDatabase();

    const contentType = await ContentType.create({
      ...input,
      siteId: toObjectId(input.siteId),
      fields: input.fields ?? [],
      createdBy: actorId ? toObjectId(actorId) : undefined,
      updatedBy: actorId ? toObjectId(actorId) : undefined
    });

    return contentType.toObject();
  },

  async update(
    id: ObjectIdLike,
    updates: UpdateContentTypeInput,
    actorId?: ObjectIdLike
  ): Promise<LeanDocument<ContentTypeDocument> | null> {
    await connectToDatabase();

    const updatePayload: UpdateQuery<ContentTypeDocument> = {
      ...updates,
      updatedBy: actorId ? toObjectId(actorId) : undefined
    };

    const doc = await ContentType.findOneAndUpdate(
      { _id: toObjectId(id) },
      updatePayload,
      { new: true, runValidators: true }
    );

    return doc ? doc.toObject() : null;
  },

  async findById(
    id: ObjectIdLike,
    options: { includeDeleted?: boolean } = {}
  ): Promise<LeanDocument<ContentTypeDocument> | null> {
    await connectToDatabase();
    const query = ContentType.findById(toObjectId(id));
    if (options.includeDeleted) {
      query.setOptions({ includeDeleted: true });
    }
    return query.lean();
  },

  async findByApiId(
    siteId: ObjectIdLike,
    apiId: string,
    options: { includeDeleted?: boolean } = {}
  ): Promise<LeanDocument<ContentTypeDocument> | null> {
    await connectToDatabase();
    const query = ContentType.findOne({ siteId: toObjectId(siteId), apiId: apiId.toLowerCase() });
    if (options.includeDeleted) {
      query.setOptions({ includeDeleted: true });
    }
    return query.lean();
  },

  async list(
    filters: ListContentTypesFilters
  ): Promise<PaginatedResult<LeanDocument<ContentTypeDocument>>> {
    await connectToDatabase();
    const query = ContentType.find(buildContentTypeQuery(filters));
    if (filters.includeDeleted) {
      query.setOptions({ includeDeleted: true });
    }
    return applyCursorPagination(query, filters);
  },

  async softDelete(id: ObjectIdLike, actorId?: ObjectIdLike): Promise<void> {
    await connectToDatabase();
    const doc = await ContentType.findById(toObjectId(id)).setOptions({ includeDeleted: true });
    if (!doc) {
      return;
    }
    await doc.softDelete(actorId ? toObjectId(actorId) : undefined);
  },

  async restore(id: ObjectIdLike, actorId?: ObjectIdLike): Promise<void> {
    await connectToDatabase();
    const doc = await ContentType.findById(toObjectId(id)).setOptions({ includeDeleted: true });
    if (!doc) {
      return;
    }
    await doc.restore(actorId ? toObjectId(actorId) : undefined);
  }
};
