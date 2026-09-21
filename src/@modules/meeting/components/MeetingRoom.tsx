"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/src/@libs/api/client";
import { useAuth } from "@/src/@modules/auth/context/AuthProvider";
import { ROOM_ID_PATTERN } from "@/src/@modules/auth/libs/return-path";
import CaptionPanel from "@/src/@modules/captions/CaptionPanel";
import { useCaptionFeed } from "@/src/@modules/captions/useCaptionFeed";
import CopyInviteButton from "./CopyInviteButton";
import type { Meeting } from "../types";
export default function MeetingRoom({ roomId }: { roomId: string }) {
  const { user } = useAuth(); const { captions } = useCaptionFeed();
  const [meeting, setMeeting] = useState<Meeting | null>(null); const [error, setError] = useState(""); const [canRetry, setCanRetry] = useState(false); const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!ROOM_ID_PATTERN.test(roomId)) return;
    const controller = new AbortController();
    void api<{ meeting: Meeting }>(`/meetings/${roomId}`, { signal: controller.signal }).then(result => setMeeting(result.meeting)).catch(error => {
      if (controller.signal.aborted) return;
      setError(error instanceof Error ? error.message : "Unable to load meeting.");
      setCanRetry(!(error instanceof ApiError) || ![400, 401, 404, 410].includes(error.status));
    });
    return () => controller.abort();
  }, [roomId, retry]);
  if (!ROOM_ID_PATTERN.test(roomId)) return <section className="p-6"><h1>Invalid meeting link</h1><Link href="/dashboard" className="underline">Return to dashboard</Link></section>;
  if (error) return <section className="p-6"><p role="alert">{error}</p>{canRetry && <button className="my-3 rounded border p-2" onClick={() => { setError(""); setMeeting(null); setRetry(value => value + 1); }}>Retry</button>}<Link className="mt-4 block underline" href="/dashboard">Return to dashboard</Link></section>;
  if (!meeting) return <p role="status" className="p-6">Loading meeting…</p>;
  return <section className="mx-auto max-w-7xl p-4"><header className="mb-4 flex flex-wrap items-start justify-between gap-3"><h1 className="text-2xl font-bold">{meeting.title}</h1><CopyInviteButton roomId={meeting.roomId} /></header>
    <p className="mb-4 text-amber-200">Meeting shell — waiting for LiveKit media integration. Up to {meeting.maxParticipants} participants.</p>
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]"><div aria-label="Participant video area" className="grid min-h-80 grid-cols-1 gap-3 sm:grid-cols-2"><div className="flex min-h-64 flex-col justify-end rounded-xl bg-slate-800 p-5"><p className="mb-auto text-slate-400">Video is not connected yet.</p><strong>{user?.displayName} (you) {meeting.hostUserId === user?.id && "· Host"}</strong></div></div><CaptionPanel captions={captions} /></div>
    <footer className="mt-4 flex flex-wrap justify-center gap-3 rounded-xl bg-slate-900 p-4"><button disabled title="Available after LiveKit integration" className="rounded border p-3 opacity-50">Microphone</button><button disabled title="Available after LiveKit integration" className="rounded border p-3 opacity-50">Camera</button><button disabled title="Recognition engine integration point" className="rounded border p-3 opacity-50">Sign recognition</button><Link href="/dashboard" className="rounded bg-red-800 p-3">Leave meeting</Link></footer>
  </section>;
}
