import type { Capability } from "@/server/auth/rbac";
import { auth } from "@/server/auth";
import { ApiError } from "@/server/api/errors";

export const requireSession = async () => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "Authentication required", 401);
  }
  if (session.user.status !== "active") {
    throw new ApiError("FORBIDDEN", "Account is not active", 403);
  }
  return session;
};

export const ensureCapability = async (capability: Capability) => {
  const session = await requireSession();
  const hasAccess = session.user.capabilities?.includes(capability);
  if (!hasAccess) {
    throw new ApiError("FORBIDDEN", "Insufficient permissions", 403);
  }
  return session;
};
