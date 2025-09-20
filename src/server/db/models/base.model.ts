import type { Document, Model, Query } from "mongoose";
import { Schema, Types } from "mongoose";

export interface BaseFields {
  createdBy?: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;
  isDeleted: boolean;
  deletedAt?: Date | null;
}

export interface BaseDocument extends BaseFields, Document {
  createdAt: Date;
  updatedAt: Date;
  softDelete(userId?: Types.ObjectId | string): Promise<this>;
  restore(userId?: Types.ObjectId | string): Promise<this>;
}

export interface SoftDeleteQueryHelpers {
  withDeleted(this: Query<any, any, any, this>): this;
  onlyDeleted(this: Query<any, any, any, this>): this;
}

export type BaseModel<T extends BaseDocument> = Model<T, SoftDeleteQueryHelpers>;

type QueryWithSoftDelete = Query<any, any> & {
  getOptions(): { includeDeleted?: boolean };
};

const applySoftDeleteFilter = function (this: QueryWithSoftDelete, next: () => void) {
  const { includeDeleted } = this.getOptions();
  if (!includeDeleted) {
    this.where({ isDeleted: false });
  }
  next();
};

export const withBaseModel = <T extends BaseDocument>(schema: Schema<T>): void => {
  schema.add({
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null }
  });

  schema.set("timestamps", true);
  schema.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform: (_, ret) => {
      delete ret._id;
      return ret;
    }
  });
  schema.set("toObject", { virtuals: true, versionKey: false });

  schema.virtual("id").get(function (this: Document & { _id: Types.ObjectId }) {
    return this._id.toString();
  });

  schema.pre(/^find/, applySoftDeleteFilter);
  schema.pre("count", applySoftDeleteFilter);
  schema.pre("countDocuments", applySoftDeleteFilter);
  schema.pre("findOne", applySoftDeleteFilter);
  schema.pre("findOneAndUpdate", applySoftDeleteFilter);

  schema.methods.softDelete = async function (userId?: Types.ObjectId | string) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    if (userId) {
      this.updatedBy = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
    }
    await this.save();
    return this;
  };

  schema.methods.restore = async function (userId?: Types.ObjectId | string) {
    this.isDeleted = false;
    this.deletedAt = null;
    if (userId) {
      this.updatedBy = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
    }
    await this.save();
    return this;
  };

  schema.query.withDeleted = function (this: QueryWithSoftDelete) {
    return this.setOptions({ includeDeleted: true });
  };

  schema.query.onlyDeleted = function (this: QueryWithSoftDelete) {
    return this.setOptions({ includeDeleted: true }).where({ isDeleted: true });
  };
};
