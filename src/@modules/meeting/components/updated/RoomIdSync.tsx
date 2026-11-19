"use client";

import { useEffect } from "react";
import useGlobalState from "@/src/@libs/hooks/useGlobalState";

export default function RoomIdSync({ roomId }: { roomId: string }) {
  const [, setRoomId, clearRoomId] = useGlobalState<string | null>({
    key: "roomId",
    initialValue: null,
  });

  useEffect(() => {
    setRoomId(roomId);

    // Optional: clear roomId from global state when leaving the room page
    return () => {
      clearRoomId();
    };
  }, [roomId]);

  return null;
}
