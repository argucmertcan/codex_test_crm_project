import { RateLimiterMemory } from "rate-limiter-flexible";

import { env } from "@/lib/env";
import { ApiError } from "@/server/api/errors";

const rateLimiter = new RateLimiterMemory({
  points: env.RATE_LIMIT_MAX,
  duration: env.RATE_LIMIT_WINDOW,
  keyPrefix: "api"
});

const getClientKey = (request: Request, suffix = "") => {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0] || (request as any).ip || "unknown";
  const sessionToken =
    request.headers.get("x-session-token") ??
    request.headers.get("authorization") ??
    request.headers.get("cookie") ??
    "anon";
  return `${ip}:${sessionToken}:${suffix}`;
};

export const enforceRateLimit = async (request: Request, suffix = "") => {
  try {
    await rateLimiter.consume(getClientKey(request, suffix));
  } catch (error) {
    throw new ApiError("RATE_LIMITED", "Too many requests", 429);
  }
};
