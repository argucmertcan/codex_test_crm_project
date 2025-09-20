import type { FilterQuery, LeanDocument, UpdateQuery } from "mongoose";
import { Types } from "mongoose";

import { connectToDatabase } from "../connection";
import type { UserDocument, UserRole, UserStatus } from "../models/user.model";
import { User } from "../models/user.model";
import { applyCursorPagination, type PaginatedResult, type PaginationParams, toObjectId } from "./utils";

type ObjectIdLike = string | Types.ObjectId;

export interface CreateUserInput {
  name: string;
  email: string;
  image?: string | null;
  roles?: UserRole[];
  teamId?: ObjectIdLike | null;
  status?: UserStatus;
  passwordHash?: string | null;
}

export interface UpdateUserInput {
  name?: string;
  image?: string | null;
  roles?: UserRole[];
  teamId?: ObjectIdLike | null;
  status?: UserStatus;
  lastLoginAt?: Date | null;
  passwordHash?: string | null;
}

export interface ListUsersFilters extends PaginationParams {
  search?: string;
  teamId?: ObjectIdLike | null;
  roles?: UserRole[];
  statuses?: UserStatus[];
  includeDeleted?: boolean;
}

const buildUserQuery = (filters: ListUsersFilters): FilterQuery<UserDocument> => {
  const query: FilterQuery<UserDocument> = {};

  if (filters.teamId) {
    query.teamId = toObjectId(filters.teamId);
  }

  if (filters.roles?.length) {
    query.roles = { $in: filters.roles };
  }

  if (filters.statuses?.length) {
    query.status = { $in: filters.statuses };
  }

  if (filters.search) {
    const regex = new RegExp(filters.search.trim(), "i");
    query.$or = [{ name: regex }, { email: regex }];
  }

  return query;
};

export const userRepository = {
  async create(input: CreateUserInput, actorId?: ObjectIdLike): Promise<LeanDocument<UserDocument>> {
    await connectToDatabase();

    const user = await User.create({
      ...input,
      teamId: input.teamId ? toObjectId(input.teamId) : null,
      createdBy: actorId ? toObjectId(actorId) : undefined,
      updatedBy: actorId ? toObjectId(actorId) : undefined
    });

    return user.toObject();
  },

  async update(
    id: ObjectIdLike,
    updates: UpdateUserInput,
    actorId?: ObjectIdLike
  ): Promise<LeanDocument<UserDocument> | null> {
    await connectToDatabase();

    const updatePayload: UpdateQuery<UserDocument> = {
      ...updates,
      teamId: updates.teamId ? toObjectId(updates.teamId) : updates.teamId === null ? null : undefined,
      updatedBy: actorId ? toObjectId(actorId) : undefined
    };

    if (updates.lastLoginAt === null) {
      updatePayload.$unset = { ...(updatePayload.$unset ?? {}), lastLoginAt: "" };
    }

    const doc = await User.findOneAndUpdate(
      { _id: toObjectId(id) },
      updatePayload,
      { new: true, runValidators: true }
    );

    return doc ? doc.toObject() : null;
  },

  async touchLastLogin(id: ObjectIdLike): Promise<void> {
    await connectToDatabase();
    await User.updateOne(
      { _id: toObjectId(id) },
      { $set: { lastLoginAt: new Date() } }
    );
  },

  async findById(
    id: ObjectIdLike,
    options: { includeDeleted?: boolean } = {}
  ): Promise<LeanDocument<UserDocument> | null> {
    await connectToDatabase();
    const query = User.findById(toObjectId(id));
    if (options.includeDeleted) {
      query.setOptions({ includeDeleted: true });
    }
    return query.lean();
  },

  async findByEmail(email: string, options: { includeDeleted?: boolean } = {}): Promise<LeanDocument<UserDocument> | null> {
    await connectToDatabase();
    const query = User.findOne({ email: email.toLowerCase() });
    if (options.includeDeleted) {
      query.setOptions({ includeDeleted: true });
    }
    return query.lean();
  },

  async list(filters: ListUsersFilters): Promise<PaginatedResult<LeanDocument<UserDocument>>> {
    await connectToDatabase();
    const query = User.find(buildUserQuery(filters));
    if (filters.includeDeleted) {
      query.setOptions({ includeDeleted: true });
    }
    return applyCursorPagination(query, filters);
  },

  async softDelete(id: ObjectIdLike, actorId?: ObjectIdLike): Promise<void> {
    await connectToDatabase();
    const doc = await User.findById(toObjectId(id)).setOptions({ includeDeleted: true });
    if (!doc) {
      return;
    }
    await doc.softDelete(actorId ? toObjectId(actorId) : undefined);
  },

  async restore(id: ObjectIdLike, actorId?: ObjectIdLike): Promise<void> {
    await connectToDatabase();
    const doc = await User.findById(toObjectId(id)).setOptions({ includeDeleted: true });
    if (!doc) {
      return;
    }
    await doc.restore(actorId ? toObjectId(actorId) : undefined);
  }
};
