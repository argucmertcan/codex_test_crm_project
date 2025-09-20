import { NextRequest } from "next/server";

import { ensureCapability } from "@/server/api/auth";
import { ApiError, createErrorResponse } from "@/server/api/errors";
import { success } from "@/server/api/http";
import { enforceRateLimit } from "@/server/api/rate-limit";
import { contentTypeRepository } from "@/server/db/repositories/contentType.repository";

interface RouteContext {
  params: { id: string };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await enforceRateLimit(request, "content-types:get:detail");
    await ensureCapability("manageContentTypes");
    const contentType = await contentTypeRepository.findById(context.params.id);
    if (!contentType) {
      throw new ApiError("NOT_FOUND", "Content type not found", 404);
    }
    return success(contentType);
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}
