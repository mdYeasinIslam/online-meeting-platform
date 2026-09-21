"use client";
import { Room } from "livekit-client";
import { api } from "@/src/@libs/api/client";
export interface JoinCredentials { token: string; serverUrl: string; roomId: string; }
export function fetchJoinCredentials(roomId: string, signal?: AbortSignal): Promise<JoinCredentials> {
  return api(`/meetings/${encodeURIComponent(roomId)}/token`, { method: "POST", signal });
}
/** Tokens stay in memory. Each explicit join owns one room and its media tracks. */
export function createMeetingRoom(): Room { return new Room({ adaptiveStream: true, dynacast: true }); }
