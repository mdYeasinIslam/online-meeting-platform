"use client";
import { useCallback, useEffect, useRef } from "react";
import type { Room } from "livekit-client";
import { LiveKitCaptionTransport } from "./livekit-transport";
import { useCaptionFeed } from "./useCaptionFeed";
import type { CaptionSubmission } from "./types";
export function useMeetingCaptions(room: Room) {
  const { captions, addCaption } = useCaptionFeed();
  const transport = useRef<LiveKitCaptionTransport | null>(null);
  useEffect(() => {
    const session = new LiveKitCaptionTransport(room);
    transport.current = session;
    const unsubscribe = session.subscribe(addCaption);
    return () => { unsubscribe(); session.dispose(); transport.current = null; };
  }, [room, addCaption]);
  const publish = useCallback((caption: CaptionSubmission) => {
    if (!transport.current) return Promise.reject(new Error("Caption transport is not ready. Please retry."));
    return transport.current.publish(caption);
  }, []);
  return { captions, publish };
}
