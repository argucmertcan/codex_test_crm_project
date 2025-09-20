import { NextRequest } from "next/server";
import { z } from "zod";

import {
  contentTypeCreateSchema,
  contentTypeQuerySchema,
  contentTypeUpdateSchema
} from "@/lib/validations/content-type";
import { ensureCapability } from "@/server/api/auth";
import { ApiError, createErrorResponse } from "@/server/api/errors";
import { success } from "@/server/api/http";
import { enforceRateLimit } from "@/server/api/rate-limit";
import { contentTypeRepository } from "@/server/db/repositories/contentType.repository";

const identifierSchema = z.object({ id: z.string().min(1) });

export async function GET(request: NextRequest) {
  try {
    await enforceRateLimit(request, "content-types:get");
    await ensureCapability("manageContentTypes");

    const params = contentTypeQuerySchema.parse({
      siteId: request.nextUrl.searchParams.get("siteId"),
      cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
      search: request.nextUrl.searchParams.get("q") ?? undefined
    });

    const result = await contentTypeRepository.list({
      siteId: params.siteId,
      search: params.search,
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
    await enforceRateLimit(request, "content-types:post");
    const session = await ensureCapability("manageContentTypes");
    const payload = contentTypeCreateSchema.parse(await request.json());
    const created = await contentTypeRepository.create(payload, session.user.id);
    return success(created, { status: 201 });
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await enforceRateLimit(request, "content-types:patch");
    const session = await ensureCapability("manageContentTypes");
    const payload = contentTypeUpdateSchema.parse(await request.json());

    const updated = await contentTypeRepository.update(payload.id, payload, session.user.id);
    if (!updated) {
      throw new ApiError("NOT_FOUND", "Content type not found", 404);
    }

    return success(updated);
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await enforceRateLimit(request, "content-types:delete");
    const session = await ensureCapability("manageContentTypes");
    const { id } = identifierSchema.parse(await request.json());

    const existing = await contentTypeRepository.findById(id);
    if (!existing) {
      throw new ApiError("NOT_FOUND", "Content type not found", 404);
    }

    await contentTypeRepository.softDelete(id, session.user.id);
    return success({ id });
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}
