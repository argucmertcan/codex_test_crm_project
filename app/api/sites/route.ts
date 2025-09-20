import { NextRequest } from "next/server";

import { siteCreateSchema, siteQuerySchema } from "@/lib/validations/site";
import { ensureCapability } from "@/server/api/auth";
import { ApiError, createErrorResponse } from "@/server/api/errors";
import { success } from "@/server/api/http";
import { enforceRateLimit } from "@/server/api/rate-limit";
import { siteRepository } from "@/server/db/repositories/site.repository";

export async function GET(request: NextRequest) {
  try {
    await enforceRateLimit(request, "sites:get");
    await ensureCapability("manageSite");

    const params = siteQuerySchema.parse({
      cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
      q: request.nextUrl.searchParams.get("q") ?? undefined,
      teamId: request.nextUrl.searchParams.get("teamId") ?? undefined
    });

    const result = await siteRepository.list({
      search: params.q,
      teamId: params.teamId ?? null,
      limit: params.limit,
      cursor: params.cursor
    });

    return success(result);
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "sites:post");
    const session = await ensureCapability("manageSite");
    const payload = siteCreateSchema.parse(await request.json());

    if (payload.defaultLocale && payload.locales && !payload.locales.includes(payload.defaultLocale)) {
      throw new ApiError("INVALID_DEFAULT_LOCALE", "defaultLocale must be part of locales", 400);
    }

    const created = await siteRepository.create(payload, session.user.id);
    return success(created, { status: 201 });
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}
