"use client";

import type { RefCallback } from "react";
import { useState } from "react";
import {
  useConnectionState,
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import { ConnectionState, LocalVideoTrack } from "livekit-client";
import { Hand, HandMetal } from "lucide-react";
import { useMeetingCaptions } from "@/src/@modules/captions/useMeetingCaptions";
import { useMeetingChatCopy } from "@/src/@modules/captions/updated/useMeetingChatCopy";
import { useSignComposer } from "@/src/@modules/sign-recognition/useSignComposer";
import { RECOGNITION_MESSAGES } from "@/src/@modules/sign-recognition/config";
import MeetingControlsCopy from "./MeetingControlsCopy";
import MeetingSidebarCopy from "./MeetingSidebarCopy";
import ParticipantGridCopy from "./ParticipantGridCopy";

type SidebarTab = "message" | "sign";

export default function ConnectedMeetingCopy({
  hostUserId,
  starting,
  leaving,
  onLeave,
  endControlRef,
}: {
  hostUserId: string;
  starting: boolean;
  leaving: boolean;
  onLeave: () => void;
  endControlRef: RefCallback<HTMLDivElement>;
}) {
  const room = useRoomContext();
  const state = useConnectionState();
  const { cameraTrack, isCameraEnabled, localParticipant } =
    useLocalParticipant();
  const { captions, publish } = useMeetingCaptions(room);
  const {
    messages,
    send: sendChat,
    pending: chatPending,
    error: chatError,
  } = useMeetingChatCopy(room);
  const track =
    isCameraEnabled && cameraTrack?.track instanceof LocalVideoTrack
      ? cameraTrack.track
      : undefined;
  const connected = state === ConnectionState.Connected;
  const composer = useSignComposer(track, connected, publish);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>("message");

  function toggleSignRecognition() {
    if (!composer.enabled) {
      setSidebarOpen(true);
      setActiveTab("sign");
    }
    composer.toggle();
  }

  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl">
        {state !== ConnectionState.Connected && (
          <p
            role="status"
            className="absolute left-2 top-2 z-10 rounded-full bg-black/60 px-3 py-1.5 text-xs text-slate-200"
          >
            {state === ConnectionState.Reconnecting
              ? "Reconnecting… your media may pause."
              : "Connecting to meeting…"}
          </p>
        )}
        <ParticipantGridCopy hostUserId={hostUserId} />
        <MeetingControlsCopy
          endControlRef={endControlRef}
          starting={starting}
          leaving={leaving}
          onLeave={onLeave}
          signControl={
            <button
              type="button"
              aria-label={
                composer.enabled
                  ? "Stop sign recognition"
                  : "Start sign recognition"
              }
              aria-pressed={composer.enabled}
              disabled={
                leaving ||
                starting ||
                state !== ConnectionState.Connected ||
                (!composer.enabled && !composer.usable)
              }
              title={
                composer.usable || composer.enabled
                  ? RECOGNITION_MESSAGES[composer.status.phase]
                  : "Connect and turn on your camera to recognize signs"
              }
              onClick={toggleSignRecognition}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${composer.enabled ? "bg-emerald-700 hover:bg-emerald-600" : "bg-[#3c4048] hover:bg-[#4a4e57]"}`}
            >
              {composer.enabled ? <HandMetal size={21} /> : <Hand size={21} />}
            </button>
          }
        />
      </main>
      <MeetingSidebarCopy
        messages={messages}
        captions={captions}
        composer={composer}
        localParticipantId={localParticipant.identity}
        chatError={chatError}
        chatPending={chatPending}
        onSendChat={sendChat}
        open={sidebarOpen}
        onOpen={() => setSidebarOpen(true)}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        connected={connected}
      />
    </div>
  );
}
