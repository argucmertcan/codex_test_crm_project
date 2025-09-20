import { model, models, Schema, Types } from "mongoose";

import type { BaseDocument, BaseModel } from "./base.model";
import { withBaseModel } from "./base.model";

export type UserRole = "admin" | "editor" | "author" | "viewer";
export type UserStatus = "active" | "invited" | "suspended";

export interface User extends BaseDocument {
  name: string;
  email: string;
  image?: string | null;
  roles: UserRole[];
  teamId?: Types.ObjectId | null;
  status: UserStatus;
  lastLoginAt?: Date | null;
  passwordHash?: string | null;
}

export type UserDocument = User;
export type UserModel = BaseModel<UserDocument>;

const userSchema = new Schema<UserDocument, UserModel>({
  name: { type: String, trim: true, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  image: { type: String, default: null },
  roles: {
    type: [String],
    enum: ["admin", "editor", "author", "viewer"],
    default: ["viewer"],
    index: true
  },
  teamId: { type: Schema.Types.ObjectId, ref: "Team", default: null, index: true },
  status: {
    type: String,
    enum: ["active", "invited", "suspended"],
    default: "active",
    index: true
  },
  lastLoginAt: { type: Date, default: null },
  passwordHash: { type: String, default: null }
});

withBaseModel(userSchema);

userSchema.index(
  { email: 1 },
  { unique: true, collation: { locale: "en", strength: 2 }, partialFilterExpression: { isDeleted: false } }
);

userSchema.index({ name: "text", email: "text" });

userSchema.virtual("isAdmin").get(function (this: UserDocument) {
  return this.roles.includes("admin");
});

export const User = (models.User as UserModel) ?? model<UserDocument, UserModel>("User", userSchema);
