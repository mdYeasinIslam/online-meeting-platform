"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Room } from "livekit-client";
import { LiveKitChatTransportCopy, type ChatMessageCopy } from "./LiveKitChatTransportCopy";

const HISTORY_LIMIT = 300;

export function useMeetingChatCopy(room: Room) {
  const transport = useRef<LiveKitChatTransportCopy | null>(null);
  const [messages, setMessages] = useState<ChatMessageCopy[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = new LiveKitChatTransportCopy(room);
    transport.current = session;
    setMessages([]);
    const unsubscribe = session.subscribe((message) =>
      setMessages((current) => [...current, message].slice(-HISTORY_LIMIT)),
    );
    return () => {
      unsubscribe();
      session.dispose();
      if (transport.current === session) transport.current = null;
    };
  }, [room]);

  const send = useCallback(async (text: string) => {
    if (!transport.current) throw new Error("Chat is reconnecting. Please retry.");
    setPending(true);
    setError("");
    try {
      await transport.current.publish(text);
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : "Message could not be sent.";
      setError(message);
      throw failure;
    } finally {
      setPending(false);
    }
  }, []);

  return { messages, send, pending, error };
}
