"use client";
import { useConnectionState, useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { ConnectionState, LocalVideoTrack } from "livekit-client";
import CaptionPanel from "@/src/@modules/captions/CaptionPanel";
import { useMeetingCaptions } from "@/src/@modules/captions/useMeetingCaptions";
import { useSignComposer } from "@/src/@modules/sign-recognition/useSignComposer";
import SignCaptionComposer from "@/src/@modules/sign-recognition/components/SignCaptionComposer";
import { RECOGNITION_MESSAGES } from "@/src/@modules/sign-recognition/config";
import MeetingControls from "./MeetingControls";
import ParticipantGrid from "./ParticipantGrid";
export default function ConnectedMeeting({ hostUserId, starting, leaving, onLeave }: { hostUserId: string; starting: boolean; leaving: boolean; onLeave: () => void }) {
  const room = useRoomContext();
  const state = useConnectionState();
  const { cameraTrack, isCameraEnabled, localParticipant } = useLocalParticipant();
  const { captions, publish } = useMeetingCaptions(room);
  const track = isCameraEnabled && cameraTrack?.track instanceof LocalVideoTrack ? cameraTrack.track : undefined;
  const connected = state === ConnectionState.Connected;
  const composer = useSignComposer(track, connected, publish);
  return <>
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]"><ParticipantGrid hostUserId={hostUserId} /><CaptionPanel captions={captions} localParticipantId={localParticipant.identity} /></div>
    <MeetingControls starting={starting} leaving={leaving} onLeave={onLeave} signControl={<button aria-pressed={composer.enabled} disabled={leaving || starting || (!composer.enabled && !composer.usable)} title={composer.usable || composer.enabled ? RECOGNITION_MESSAGES[composer.status.phase] : "Connect and turn on your camera to recognize signs"} onClick={composer.toggle} className="rounded border p-3 disabled:opacity-50">{composer.enabled ? "Stop sign recognition" : "Start sign recognition"}</button>} />
    <SignCaptionComposer composer={composer} connected={connected} />
  </>;
}
