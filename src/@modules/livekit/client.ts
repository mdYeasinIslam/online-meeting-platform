"use client";
import { Room } from "livekit-client";
import { api } from "@/src/@libs/api/client";
export interface JoinCredentials { token: string; serverUrl: string; roomId: string; }
export function fetchJoinCredentials(roomId: string): Promise<JoinCredentials> {
  return api(`/meetings/${encodeURIComponent(roomId)}/token`, { method: "POST" });
}
/** Day 2 owns connect/disconnect, tracks and cleanup. Tokens stay in memory only. */
export function createMeetingRoom(): Room { return new Room({ adaptiveStream: true, dynacast: true }); }
