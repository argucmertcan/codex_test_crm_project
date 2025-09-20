import type { LeanDocument, Query } from "mongoose";
import { Types } from "mongoose";

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export interface PaginationParams {
  limit?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

const normalizeLimit = (limit?: number): number => {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.min(Math.max(limit, 1), MAX_PAGE_SIZE);
};

export const applyCursorPagination = async <T extends { _id: Types.ObjectId }>(
  query: Query<LeanDocument<T>[], T>,
  params: PaginationParams
): Promise<PaginatedResult<LeanDocument<T>>> => {
  const pageSize = normalizeLimit(params.limit);
  query.sort({ _id: -1 }).limit(pageSize + 1);

  if (params.cursor && Types.ObjectId.isValid(params.cursor)) {
    query.where({ _id: { $lt: new Types.ObjectId(params.cursor) } });
  }

  const docs = await query.lean();
  const hasMore = docs.length > pageSize;
  const items = hasMore ? docs.slice(0, pageSize) : docs;
  const nextCursor = hasMore ? items[items.length - 1]._id.toString() : null;

  return {
    items,
    nextCursor,
    hasMore
  };
};

export const toObjectId = (id: string | Types.ObjectId): Types.ObjectId => {
  if (id instanceof Types.ObjectId) {
    return id;
  }

  if (!Types.ObjectId.isValid(id)) {
    throw new Error("Invalid identifier");
  }

  return new Types.ObjectId(id);
};
