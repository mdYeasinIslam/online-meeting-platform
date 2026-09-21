export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/$/, "");
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
async function readResponse<T>(
  response: Response,
  notifyExpired = true,
): Promise<T> {
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (
      notifyExpired &&
      response.status === 401 &&
      typeof window !== "undefined"
    )
      window.dispatchEvent(new Event("auth-expired"));
    throw new ApiError(
      response.status,
      typeof data.error === "string" ? data.error : "The request failed.",
    );
  }
  return data as T;
}
export async function api<T>(
  path: string,
  options: {
    method?: "GET" | "POST";
    body?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = {};
  const signal = options.signal
    ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)])
    : AbortSignal.timeout(15000);
  try {
    if (method === "POST") {
      // Fetch per mutation so login/logout session regeneration cannot leave a stale token cached.
      const response = await fetch(`${API_BASE_URL}/auth/csrf`, {
        credentials: "include",
        cache: "no-store",
        signal,
      });
      const { csrfToken } = await readResponse<{ csrfToken: string }>(response);
      headers["X-CSRF-Token"] = csrfToken;
      headers["Content-Type"] = "application/json";
    }
    return await readResponse<T>(
      await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        credentials: "include",
        cache: "no-store",
        signal,
        body:
          method === "POST" ? JSON.stringify(options.body ?? {}) : undefined,
      }),
      path !== "/auth/me" && path !== "/auth/login",
    );
  } catch (error) {
    if (error instanceof ApiError || options.signal?.aborted) throw error;
    throw new ApiError(
      0,
      "Cannot reach the server. Check your connection and that the Express server is running.",
    );
  }
}
