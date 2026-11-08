"use client";
import { useEffect, useRef, useState, type ReactNode, type RefCallback } from "react";
import { useConnectionState, useLocalParticipant } from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { deviceMessage } from "@/src/@modules/livekit/errors";

export default function MeetingControls({ starting, leaving, onLeave, signControl, endControlRef }: { starting: boolean; leaving: boolean; onLeave: () => void; signControl: ReactNode; endControlRef: RefCallback<HTMLDivElement> }) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const state = useConnectionState();
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function toggle(device: "Camera" | "Microphone") {
    if (lock.current) return;
    lock.current = true; setPending(true); setError("");
    try {
      if (device === "Camera") await localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled);
      else await localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
    } catch (failure) { if (mounted.current) setError(deviceMessage(device, failure)); }
    finally {
      lock.current = false;
      if (mounted.current) setPending(false);
      else for (const publication of localParticipant.trackPublications.values()) publication.track?.stop();
    }
  }
  const disabled = starting || pending || leaving || state !== ConnectionState.Connected;
  return <footer className="mt-4 rounded-xl bg-slate-900 p-4">
    <div className="flex flex-wrap justify-center gap-3">
      <button disabled={disabled} aria-pressed={isMicrophoneEnabled} onClick={() => void toggle("Microphone")} className="rounded border p-3 disabled:opacity-50">{isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"}</button>
      <button disabled={disabled} aria-pressed={isCameraEnabled} onClick={() => void toggle("Camera")} className="rounded border p-3 disabled:opacity-50">{isCameraEnabled ? "Turn camera off" : "Turn camera on"}</button>
      {signControl}
      <div className="flex flex-wrap items-center gap-3">
      <button disabled={leaving} onClick={onLeave} className="rounded bg-red-800 p-3 disabled:opacity-50">{leaving ? "Leaving…" : "Leave meeting"}</button>
      <div ref={endControlRef} className="contents" />
      </div>
    </div>
    {error && <p role="alert" className="mt-3 text-amber-200">{error}</p>}
  </footer>;
}
