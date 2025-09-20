import { NextRequest } from "next/server";

import { entryStatusSchema, entryUpdateSchema } from "@/lib/validations/entry";
import { ensureCapability } from "@/server/api/auth";
import { ApiError, createErrorResponse } from "@/server/api/errors";
import { noContent, success } from "@/server/api/http";
import { enforceRateLimit } from "@/server/api/rate-limit";
import { entryRepository } from "@/server/db/repositories/entry.repository";

interface RouteContext {
  params: { id: string };
}

const requiresPublishPermission = (status?: string) => {
  if (!status) {
    return false;
  }
  const parsed = entryStatusSchema.safeParse(status);
  if (!parsed.success) {
    return false;
  }
  return parsed.data === "published" || parsed.data === "scheduled";
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await enforceRateLimit(request, "entries:get:detail");
    await ensureCapability("viewContent");
    const entry = await entryRepository.findById(context.params.id);
    if (!entry) {
      throw new ApiError("NOT_FOUND", "Entry not found", 404);
    }
    return success(entry);
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await enforceRateLimit(request, "entries:patch");
    const session = await ensureCapability("editContent");
    const payload = entryUpdateSchema.parse(await request.json());

    if (requiresPublishPermission(payload.status) && !session.user.capabilities.includes("publishContent")) {
      throw new ApiError("FORBIDDEN", "You do not have permission to publish content", 403);
    }

    const updated = await entryRepository.update(
      context.params.id,
      {
        ...payload,
        lastEditorId: session.user.id
      },
      session.user.id
    );

    if (!updated) {
      throw new ApiError("NOT_FOUND", "Entry not found", 404);
    }

    return success(updated);
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await enforceRateLimit(request, "entries:delete");
    const session = await ensureCapability("editContent");
    const existing = await entryRepository.findById(context.params.id);
    if (!existing) {
      throw new ApiError("NOT_FOUND", "Entry not found", 404);
    }

    if (existing.status === "published" && !session.user.capabilities.includes("publishContent")) {
      throw new ApiError("FORBIDDEN", "You do not have permission to delete published entries", 403);
    }

    await entryRepository.softDelete(context.params.id, session.user.id);
    return noContent();
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}
