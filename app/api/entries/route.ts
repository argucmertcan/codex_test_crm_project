import { NextRequest } from "next/server";
import { z } from "zod";

import { entryCreateSchema, entryQuerySchema, entryStatusSchema } from "@/lib/validations/entry";
import { ensureCapability } from "@/server/api/auth";
import { ApiError, createErrorResponse } from "@/server/api/errors";
import { success } from "@/server/api/http";
import { enforceRateLimit } from "@/server/api/rate-limit";
import { entryRepository } from "@/server/db/repositories/entry.repository";

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

export async function GET(request: NextRequest) {
  try {
    await enforceRateLimit(request, "entries:get");
    await ensureCapability("viewContent");

    const searchParams = request.nextUrl.searchParams;
    const params = entryQuerySchema.parse({
      siteId: searchParams.get("siteId"),
      contentTypeId: searchParams.get("contentTypeId") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("q") ?? undefined,
      locale: searchParams.get("locale") ?? undefined,
      statuses: searchParams.get("status") ?? undefined,
      taxonomy: searchParams.getAll("taxonomy"),
      authorId: searchParams.get("authorId") ?? undefined,
      publishFrom: searchParams.get("publishFrom") ?? undefined,
      publishTo: searchParams.get("publishTo") ?? undefined
    });

    const result = await entryRepository.list({
      siteId: params.siteId,
      contentTypeId: params.contentTypeId,
      cursor: params.cursor,
      limit: params.limit,
      search: params.search,
      locale: params.locale,
      statuses: params.statuses as Array<z.infer<typeof entryStatusSchema>> | undefined,
      taxonomyIds: params.taxonomy,
      authorId: params.authorId,
      publishRange: {
        from: params.publishFrom,
        to: params.publishTo
      }
    });

    return success(result);
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "entries:post");
    const session = await ensureCapability("editContent");
    const payload = entryCreateSchema.parse(await request.json());

    if (requiresPublishPermission(payload.status) && !session.user.capabilities.includes("publishContent")) {
      throw new ApiError("FORBIDDEN", "You do not have permission to publish content", 403);
    }

    const authorId = payload.authorId ?? session.user.id;
    const created = await entryRepository.create(
      {
        ...payload,
        authorId
      },
      session.user.id
    );

    return success(created, { status: 201 });
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}
