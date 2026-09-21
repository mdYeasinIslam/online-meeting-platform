"use client";
import { useEffect, useRef, useState } from "react";
import { ConnectionState, Room, RoomEvent } from "livekit-client";
import { ApiError } from "@/src/@libs/api/client";
import { createMeetingRoom, fetchJoinCredentials } from "./client";
import { connectionMessage, deviceMessage, disconnectedMessage } from "./errors";

export interface MediaChoices { microphone: boolean; camera: boolean; }
type Attempt = { controller: AbortController; room?: Room; removeListeners?: () => void };

function release(attempt: Attempt) {
  attempt.controller.abort();
  attempt.removeListeners?.();
  if (attempt.room) {
    // Release devices immediately, even while the SDK waits for its disconnect lock.
    for (const publication of attempt.room.localParticipant.trackPublications.values()) publication.track?.stop();
    void attempt.room.disconnect(true).catch(() => console.warn("LiveKit resource cleanup could not finish."));
  }
}

/** No connection effect: only a user action starts token retrieval and media capture. */
export function useMeetingConnection(roomId: string) {
  const attemptRef = useRef<Attempt | null>(null);
  const joiningRef = useRef(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [state, setState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [deviceErrors, setDeviceErrors] = useState<string[]>([]);

  useEffect(() => {
    const cleanup = () => {
      if (attemptRef.current) release(attemptRef.current);
      attemptRef.current = null;
      joiningRef.current = false;
    };
    window.addEventListener("pagehide", cleanup);
    return () => { window.removeEventListener("pagehide", cleanup); cleanup(); };
  }, [roomId]);

  async function join(choices: MediaChoices) {
    if (joiningRef.current) return;
    joiningRef.current = true;
    if (attemptRef.current) release(attemptRef.current);
    const attempt: Attempt = { controller: new AbortController() };
    attemptRef.current = attempt;
    const active = () => attemptRef.current === attempt && !attempt.controller.signal.aborted;
    setJoining(true); setError(""); setDeviceErrors([]); setRoom(null); setState(ConnectionState.Connecting);
    try {
      const credentials = await fetchJoinCredentials(roomId, attempt.controller.signal);
      if (!active()) return;
      if (credentials.roomId !== roomId) throw new Error("Unexpected room credentials");
      const nextRoom = createMeetingRoom();
      attempt.room = nextRoom;
      let connected = false;
      const onState = (value: ConnectionState) => { if (active()) setState(value); };
      const onDisconnected = (reason?: Parameters<typeof disconnectedMessage>[0]) => {
        if (active() && connected) {
          setError(disconnectedMessage(reason));
          release(attempt);
          attemptRef.current = null;
          joiningRef.current = false;
          setJoining(false); setRoom(null); setState(ConnectionState.Disconnected);
        }
      };
      nextRoom.on(RoomEvent.ConnectionStateChanged, onState);
      nextRoom.on(RoomEvent.Disconnected, onDisconnected);
      attempt.removeListeners = () => {
        nextRoom.off(RoomEvent.ConnectionStateChanged, onState);
        nextRoom.off(RoomEvent.Disconnected, onDisconnected);
      };
      await nextRoom.connect(credentials.serverUrl, credentials.token);
      if (!active()) { release(attempt); return; }
      connected = true;
      setRoom(nextRoom);
      // Independent operations: a denied camera must not block microphone publication (or vice versa).
      await Promise.all((["microphone", "camera"] as const).map(async device => {
        if (!choices[device]) return;
        try {
          if (device === "microphone") await nextRoom.localParticipant.setMicrophoneEnabled(true);
          else await nextRoom.localParticipant.setCameraEnabled(true);
        } catch (failure) {
          if (active()) setDeviceErrors(previous => [...previous, deviceMessage(device === "camera" ? "Camera" : "Microphone", failure)]);
        } finally {
          // Permission prompts can finish after navigation/disconnection.
          if (!active()) release(attempt);
        }
      }));
    } catch (failure) {
      if (active()) {
        setError(failure instanceof ApiError ? failure.message : connectionMessage(failure));
        release(attempt); setRoom(null); setState(ConnectionState.Disconnected);
      }
    } finally {
      if (attemptRef.current === attempt) { joiningRef.current = false; setJoining(false); }
    }
  }

  async function leave() {
    const attempt = attemptRef.current;
    attemptRef.current = null;
    joiningRef.current = false;
    if (attempt) {
      attempt.controller.abort(); attempt.removeListeners?.();
      try { await attempt.room?.disconnect(true); }
      catch { setError("Could not finish disconnecting. Close this tab to release device access."); return false; }
    }
    setRoom(null); setState(ConnectionState.Disconnected); setJoining(false);
    return true;
  }
  return { room, state, joining, error, deviceErrors, join, leave };
}
