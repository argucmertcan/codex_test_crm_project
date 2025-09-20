export class ApiClientError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ApiEnvelope<T> {
  ok: true;
  data: T;
}

interface ApiErrorEnvelope {
  ok: false;
  code: string;
  message: string;
  details?: unknown;
}

type ApiResponse<T> = ApiEnvelope<T> | ApiErrorEnvelope;

export const apiFetch = async <T>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    }
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => undefined)) as ApiResponse<T> | undefined;

  if (!response.ok || !payload || payload.ok === false) {
    const errorPayload = payload && "code" in payload ? payload : undefined;
    throw new ApiClientError(
      errorPayload?.message ?? response.statusText,
      response.status,
      errorPayload?.code,
      errorPayload?.details
    );
  }

  return payload.data;
};
