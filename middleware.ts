import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        if (!token) {
          return false;
        }
        return token.status === "active";
      }
    }
  }
);

export const config = {
  matcher: ["/admin/:path*"]
};
