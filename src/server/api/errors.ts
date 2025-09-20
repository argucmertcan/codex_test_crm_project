import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const createErrorResponse = (error: ApiError | ZodError | Error) => {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { ok: false, code: error.code, message: error.message, details: error.details },
      { status: error.status }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_PAYLOAD",
        message: "Invalid request payload",
        details: error.flatten()
      },
      { status: 400 }
    );
  }

  console.error("Unhandled API error", error);
  return NextResponse.json(
    {
      ok: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected error occurred"
    },
    { status: 500 }
  );
};
