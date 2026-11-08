"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { LocalVideoTrack } from "livekit-client";
import type { AcceptedText, CaptionSubmission } from "../captions/types";
import { BrowserSignSession } from "./browser-session";
import { RecognizedDraft } from "./recognized-draft";
import type { RecognitionStatus } from "./config";

export function useSignComposer(track: LocalVideoTrack | undefined, connected: boolean, publish: (caption: CaptionSubmission) => Promise<void>) {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<RecognitionStatus>({ phase: "idle" });
  const [draft] = useState(() => new RecognizedDraft());
  const draftState = useSyncExternalStore(draft.subscribe, draft.getSnapshot, draft.getSnapshot);
  const sessionRef = useRef<BrowserSignSession | null>(null);
  const usable = connected && !!track && !track.isMuted && track.mediaStreamTrack.readyState === "live";
  const accept = useCallback((accepted: AcceptedText) => draft.accept(accepted.text), [draft]);
  useEffect(() => {
    let mounted = true;
    const session = new BrowserSignSession(value => { if (mounted) setStatus(value); }, accept);
    sessionRef.current = session;
    return () => {
      mounted = false; sessionRef.current = null;
      void session.dispose().catch(() => console.warn("Recognition resource cleanup could not finish."));
    };
  }, [accept]);
  useEffect(() => {
    const session = sessionRef.current;
    if (enabled && usable && track) session?.start(track);
    else if (enabled) session?.stop("paused");
    return () => session?.stop();
  }, [enabled, usable, track]);
  return { ...draftState, enabled, toggle: () => setEnabled(value => !value), usable, status: enabled && !usable ? { phase: "paused" as const } : status, send: () => draft.send(publish), backspace: () => draft.edit(false), clear: () => draft.edit(true) };
}
export type SignComposerState = ReturnType<typeof useSignComposer>;
