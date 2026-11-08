import { ROOM_ID_PATTERN } from "../auth/libs/return-path.ts";

export type JoinInput = { roomId: string; error?: never } | { roomId?: never; error: string };

/** Same lowercase UUID-v4 rule as Express shared/return-path.ts.
 * Only returns an ID; pasted origins and query parameters are never destinations.
 */
export function parseMeetingInput(input: string): JoinInput {
  const value = input.trim();
  if (!value) return { error: "Enter a meeting link or ID." };
  const invalid = { error: "Enter a valid meeting link or ID copied from an invitation." };
  if (ROOM_ID_PATTERN.test(value)) return { roomId: value };
  // Reject browser URL repair (controls/backslashes); inspect the original path
  // below so dot segments cannot silently become a valid invitation either.
  if (/[\u0000-\u0020\u007f\\]/u.test(value)) return invalid;
  let path: string;
  if (value.startsWith("/") && !value.startsWith("//")) {
    path = value.split(/[?#]/, 1)[0];
  } else {
    const absolute = /^https?:\/\/[^/?#]+(\/[^?#]*)?(?:[?#].*)?$/i.exec(value);
    if (!absolute) return invalid;
    try {
      const url = new URL(value);
      if (!url.hostname || url.username || url.password) return invalid;
    } catch {
      return invalid;
    }
    path = absolute[1] ?? "";
  }
  const match = /^\/meeting\/([^/]+)\/?$/.exec(path);
  if (!match) return invalid;
  try {
    const roomId = decodeURIComponent(match[1]);
    return ROOM_ID_PATTERN.test(roomId) ? { roomId } : invalid;
  } catch {
    return invalid;
  }
}
