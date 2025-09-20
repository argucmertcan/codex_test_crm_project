import type { Capability } from "@/server/auth/rbac";
import type { UserRole, UserStatus } from "@/server/db/models/user.model";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      roles: UserRole[];
      status: UserStatus;
      teamId: string | null;
      capabilities: Capability[];
    };
  }

  interface User {
    id: string;
    roles?: UserRole[];
    status?: UserStatus;
    teamId?: string | null;
    capabilities?: Capability[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    roles?: UserRole[];
    status?: UserStatus;
    teamId?: string | null;
    capabilities?: Capability[];
  }
}
