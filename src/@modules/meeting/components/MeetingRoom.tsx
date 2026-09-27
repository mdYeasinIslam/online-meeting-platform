"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { RoomAudioRenderer, RoomContext, StartAudio } from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { api, ApiError } from "@/src/@libs/api/client";
import { useAuth } from "@/src/@modules/auth/context/AuthProvider";
import { ROOM_ID_PATTERN } from "@/src/@modules/auth/libs/return-path";
import { useMeetingConnection } from "@/src/@modules/livekit/useMeetingConnection";
import EndMeetingControl from "./EndMeetingControl";
import CopyInviteButton from "./CopyInviteButton";
import ConnectedMeeting from "./ConnectedMeeting";
import PreJoin from "./PreJoin";
import type { Meeting } from "../types";

export default function MeetingRoom({ roomId }: { roomId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const connection = useMeetingConnection(roomId);
  const leavingRef = useRef(false);
  const [endControlSlot, setEndControlSlot] = useState<HTMLDivElement | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [lookupTerminal, setLookupTerminal] = useState<"ending" | "ended" | null>(null);
  const [retryEnd, setRetryEnd] = useState(false);
  const [error, setError] = useState("");
  const [canRetry, setCanRetry] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!ROOM_ID_PATTERN.test(roomId)) return;
    const controller = new AbortController();
    void api<{ meeting: Meeting }>(`/meetings/${roomId}`, { signal: controller.signal }).then(result => setMeeting(result.meeting)).catch(error => {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && error.status === 410) {
        setLookupTerminal(error.code === "MEETING_ENDING" ? "ending" : "ended"); setRetryEnd(error.canEnd); return;
      }
      setError(error instanceof Error ? error.message : "Unable to load meeting.");
      setCanRetry(!(error instanceof ApiError) || ![400, 401, 404, 410].includes(error.status));
    });
    return () => controller.abort();
  }, [roomId, retry]);

  async function leave() {
    if (leavingRef.current) return;
    leavingRef.current = true; setLeaving(true);
    if (await connection.leave()) router.push("/dashboard");
    else { leavingRef.current = false; setLeaving(false); }
  }

  if (!ROOM_ID_PATTERN.test(roomId)) return <section className="p-6"><h1>Invalid meeting link</h1><Link href="/dashboard" className="underline">Return to dashboard</Link></section>;
  const terminal = connection.terminal ?? lookupTerminal;
  const host = meeting?.hostUserId === user?.id || retryEnd || connection.canEnd;
  const endControl = host ? <EndMeetingControl roomId={roomId} triggerContainer={terminal ? undefined : endControlSlot} visible={terminal !== "ended"} onEnded={() => { connection.terminate(); setLookupTerminal("ended"); }} /> : null;
  if (terminal) return <section className="mx-auto max-w-7xl p-4">{endControl}<h1 className="text-2xl font-bold">{terminal === "ended" ? "This meeting has ended" : "This meeting is ending"}</h1><p className="my-4">You can no longer join using this meeting link.</p>{terminal === "ending" && <p>Shutdown has not yet been confirmed. The host can retry ending the meeting.</p>}<Link href="/dashboard" className="underline">Return to dashboard</Link></section>;
  if (error) return <section className="p-6"><p role="alert">{error}</p>{canRetry && <button className="my-3 rounded border p-2" onClick={() => { setError(""); setMeeting(null); setRetry(value => value + 1); }}>Retry</button>}<Link className="mt-4 block underline" href="/dashboard">Return to dashboard</Link></section>;
  if (!meeting) return <p role="status" className="p-6">Loading meeting…</p>;
  return <section className="mx-auto max-w-7xl p-4">
    {endControl}
    <header className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold">{meeting.title}</h1><p className="mt-1 text-sm text-slate-300">Up to {meeting.maxParticipants} participants</p></div><CopyInviteButton roomId={meeting.roomId} /></header>
    {connection.error && <p role="alert" className="mb-4 rounded border border-amber-600 p-3 text-amber-200">{connection.error}</p>}
    {connection.deviceErrors.length > 0 && <div role="alert" className="mb-4 rounded border border-amber-600 p-3 text-amber-200">{connection.deviceErrors.map(message => <p key={message}>{message}</p>)}</div>}
    {connection.room ? <RoomContext.Provider value={connection.room}>
      <p role="status" className="mb-3">{connection.state === ConnectionState.Connected ? "Connected" : "Reconnecting… Your media may pause while the connection recovers."}</p>
      <RoomAudioRenderer />
      <StartAudio label="Enable meeting audio" className="mb-3 rounded bg-blue-700 px-4 py-2" />
      <ConnectedMeeting endControlRef={setEndControlSlot} hostUserId={meeting.hostUserId} starting={connection.joining} leaving={leaving} onLeave={() => void leave()} />
    </RoomContext.Provider> : <>
      <PreJoin name={user?.displayName ?? ""} host={meeting.hostUserId === user?.id} joining={connection.joining} onJoin={connection.join} />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button disabled={leaving} onClick={() => void leave()} className="rounded border p-3">Leave meeting</button>
        <div ref={setEndControlSlot} className="contents" />
      </div>
    </>}
  </section>;
}
