import type { UserRole } from "../db/models/user.model";

export type Capability =
  | "manageUsers"
  | "manageSite"
  | "manageContentTypes"
  | "publishContent"
  | "editContent"
  | "viewContent";

export const roleCapabilities: Record<UserRole, Capability[]> = {
  admin: [
    "manageUsers",
    "manageSite",
    "manageContentTypes",
    "publishContent",
    "editContent",
    "viewContent"
  ],
  editor: ["manageSite", "manageContentTypes", "publishContent", "editContent", "viewContent"],
  author: ["editContent", "viewContent"],
  viewer: ["viewContent"]
};

export const hasCapability = (roles: UserRole[] | undefined, capability: Capability): boolean => {
  if (!roles?.length) {
    return false;
  }

  return roles.some((role) => roleCapabilities[role]?.includes(capability));
};

export const getCapabilitiesForRoles = (roles: UserRole[] | undefined): Capability[] => {
  if (!roles?.length) {
    return [];
  }
  const capabilities = new Set<Capability>();
  for (const role of roles) {
    for (const capability of roleCapabilities[role] ?? []) {
      capabilities.add(capability);
    }
  }
  return Array.from(capabilities);
};
