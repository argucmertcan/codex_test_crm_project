import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { env } from "@/lib/env";
import { getCapabilitiesForRoles } from "@/server/auth/rbac";
import { credentialsSignInSchema } from "@/lib/validations/auth";
import { userRepository } from "@/server/db/repositories/user.repository";

const buildGoogleProvider = () => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return null;
  }

  return GoogleProvider({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    authorization: {
      params: {
        prompt: "select_account"
      }
    }
  });
};

type NextAuthUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  roles?: string[];
  status?: string;
  teamId?: string | null;
  capabilities?: string[];
};

export const authOptions: NextAuthOptions = {
  secret: env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7
  },
  pages: {
    signIn: "/auth/signin"
  },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const parsed = credentialsSignInSchema.safeParse(credentials);
        if (!parsed.success) {
          throw new Error("Invalid credentials");
        }

        const { email, password } = parsed.data;
        const user = await userRepository.findByEmail(email, { includeDeleted: false });

        if (!user || !user.passwordHash) {
          throw new Error("Invalid email or password");
        }

        if (user.status !== "active") {
          throw new Error("Your account is not active");
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        const capabilities = getCapabilitiesForRoles(user.roles);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image ?? undefined,
          roles: user.roles,
          status: user.status,
          teamId: user.teamId ? user.teamId.toString() : null,
          capabilities
        } satisfies NextAuthUser;
      }
    })
  ].filter(Boolean),
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        if (!user.email) {
          return false;
        }

        const existing = await userRepository.findByEmail(user.email);
        if (existing) {
          if (existing.status !== "active") {
            return false;
          }

          await userRepository.update(existing.id, {
            name: user.name ?? existing.name,
            image: user.image ?? (profile as { picture?: string } | null)?.picture ?? existing.image ?? null
          });

          (user as NextAuthUser).id = existing.id;
          (user as NextAuthUser).roles = existing.roles;
          (user as NextAuthUser).status = existing.status;
          (user as NextAuthUser).teamId = existing.teamId ? existing.teamId.toString() : null;
          (user as NextAuthUser).capabilities = getCapabilitiesForRoles(existing.roles);
          return true;
        }

        const created = await userRepository.create({
          name: user.name ?? user.email.split("@")[0],
          email: user.email,
          image: user.image ?? (profile as { picture?: string } | null)?.picture ?? null,
          roles: ["editor"],
          status: "active",
          passwordHash: null
        });

        (user as NextAuthUser).id = created.id;
        (user as NextAuthUser).roles = created.roles;
        (user as NextAuthUser).status = created.status;
        (user as NextAuthUser).teamId = created.teamId ? created.teamId.toString() : null;
        (user as NextAuthUser).capabilities = getCapabilitiesForRoles(created.roles);
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const enriched = user as NextAuthUser;
        token.id = enriched.id;
        token.roles = enriched.roles ?? ["viewer"];
        token.status = enriched.status ?? "active";
        token.teamId = enriched.teamId ?? null;
        token.capabilities = enriched.capabilities ?? getCapabilitiesForRoles(enriched.roles ?? ["viewer"]);
        token.name = enriched.name ?? token.name;
        token.email = enriched.email ?? token.email;
        token.picture = enriched.image ?? token.picture;
      }

      if (!token.capabilities && token.roles) {
        token.capabilities = getCapabilitiesForRoles(token.roles as string[]);
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.roles = (token.roles as string[]) ?? ["viewer"];
        session.user.status = (token.status as string) ?? "active";
        session.user.teamId = (token.teamId as string | null) ?? null;
        session.user.capabilities = (token.capabilities as string[]) ?? [];
      }
      return session;
    }
  },
  events: {
    async signIn({ user }) {
      if (user?.id) {
        try {
          await userRepository.touchLastLogin(user.id);
        } catch (error) {
          console.error("Failed to update last login", error);
        }
      }
    }
  }
};

const googleProvider = buildGoogleProvider();
if (googleProvider) {
  authOptions.providers.push(googleProvider);
}
