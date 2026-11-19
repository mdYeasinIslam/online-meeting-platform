import { API_BASE_URL, ApiError } from "@/src/@libs/api/client";

export type JoinRequestCopy = {
  id: string;
  displayName: string;
  participantType: "authenticated" | "guest";
  status: "pending" | "accepted" | "rejected" | "cancelled" | "expired";
  createdAt: string;
};
export type JoinCredentialsCopy = {
  token: string;
  serverUrl: string;
  roomId: string;
};
type RequestOptions = {
  method?: "GET" | "POST";
  secret?: string;
  body?: unknown;
};
export async function meetingApprovalRequestCopy<T>(
  roomId: string,
  suffix: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.secret) headers["x-join-secret"] = options.secret;
  if (options.method === "POST") {
    const csrf = await fetch(`${API_BASE_URL}/auth/csrf`, {
      credentials: "include",
      cache: "no-store",
    });
    const csrfData = await csrf.json().catch(() => ({}));
    if (!csrf.ok || typeof csrfData.csrfToken !== "string")
      throw new ApiError(csrf.status, "Could not verify this request.");
    headers["x-csrf-token"] = csrfData.csrfToken;
    headers["content-type"] = "application/json";
  }
  const response = await fetch(
    `${API_BASE_URL}/meetings/${encodeURIComponent(roomId)}/join-requests${suffix}`,
    {
      method: options.method ?? "GET",
      headers,
      credentials: "include",
      cache: "no-store",
      body:
        options.method === "POST"
          ? JSON.stringify(options.body ?? {})
          : undefined,
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(
      response.status,
      typeof data.error === "string"
        ? data.error
        : "Could not update the waiting room.",
      data.code,
    );
  return data as T;
}

export function savedJoinRequestCopy(roomId: string) {
  try {
    const value = sessionStorage.getItem(`meeting-join:${roomId}`);
    return value
      ? (JSON.parse(value) as {
          id: string;
          secret?: string;
          displayName: string;
          participantType: "guest" | "authenticated";
        })
      : null;
  } catch {
    return null;
  }
}
export function saveJoinRequestCopy(
  roomId: string,
  value: {
    id: string;
    secret?: string | null;
    displayName: string;
    participantType: "guest" | "authenticated";
  },
) {
  sessionStorage.setItem(`meeting-join:${roomId}`, JSON.stringify(value));
}
export function clearJoinRequestCopy(roomId: string) {
  sessionStorage.removeItem(`meeting-join:${roomId}`);
}
