import { NextRequest } from "next/server";

import { siteUpdateSchema } from "@/lib/validations/site";
import { ensureCapability } from "@/server/api/auth";
import { ApiError, createErrorResponse } from "@/server/api/errors";
import { noContent, success } from "@/server/api/http";
import { enforceRateLimit } from "@/server/api/rate-limit";
import { siteRepository } from "@/server/db/repositories/site.repository";

interface RouteContext {
  params: { id: string };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await enforceRateLimit(request, "sites:get:detail");
    await ensureCapability("manageSite");
    const site = await siteRepository.findById(context.params.id);
    if (!site) {
      throw new ApiError("NOT_FOUND", "Site not found", 404);
    }
    return success(site);
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await enforceRateLimit(request, "sites:patch");
    const session = await ensureCapability("manageSite");
    const payload = siteUpdateSchema.parse(await request.json());

    if (payload.defaultLocale && payload.locales && !payload.locales.includes(payload.defaultLocale)) {
      throw new ApiError("INVALID_DEFAULT_LOCALE", "defaultLocale must be part of locales", 400);
    }

    const updated = await siteRepository.update(context.params.id, payload, session.user.id);
    if (!updated) {
      throw new ApiError("NOT_FOUND", "Site not found", 404);
    }

    return success(updated);
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await enforceRateLimit(request, "sites:delete");
    const session = await ensureCapability("manageSite");
    const existing = await siteRepository.findById(context.params.id);
    if (!existing) {
      throw new ApiError("NOT_FOUND", "Site not found", 404);
    }
    await siteRepository.softDelete(context.params.id, session.user.id);
    return noContent();
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}
