import { NextResponse } from "next/server";

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiErrorBody {
  ok: false;
  code: string;
  message: string;
  details?: unknown;
}

export const success = <T>(data: T, init?: ResponseInit) => {
  return NextResponse.json<ApiSuccess<T>>({ ok: true, data }, init);
};

export const noContent = () => new NextResponse(null, { status: 204 });
