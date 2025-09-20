import NextAuth from "next-auth";

import { authOptions } from "./config";

export const { handlers: authHandlers, auth, signIn, signOut } = NextAuth(authOptions);
