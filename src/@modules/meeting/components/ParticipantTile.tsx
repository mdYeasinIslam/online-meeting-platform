"use client";
import { isTrackReference, useIsMuted, useParticipantInfo, VideoTrack, type TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { Track } from "livekit-client";

export default function ParticipantTile({ trackRef, hostUserId }: { trackRef: TrackReferenceOrPlaceholder; hostUserId: string }) {
  const { participant } = trackRef;
  const { name, identity } = useParticipantInfo({ participant });
  const cameraMuted = useIsMuted(trackRef);
  const microphoneMuted = useIsMuted({ participant, source: Track.Source.Microphone });
  const videoAvailable = !cameraMuted && isTrackReference(trackRef) && !!trackRef.publication.track;
  return <article data-participant={identity} data-local={participant.isLocal} aria-label={`${name || "Participant"}${participant.isLocal ? " (you)" : ""}`} className="overflow-hidden rounded-xl bg-slate-800">
    <div className="relative aspect-video min-h-36">
      {videoAvailable && isTrackReference(trackRef)
        ? <VideoTrack trackRef={trackRef} className="h-full w-full object-cover" />
        : <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-600 text-2xl" aria-hidden="true">{(name || "?").slice(0, 1).toUpperCase()}</span><span className="text-sm text-slate-300">{cameraMuted ? "Camera off" : "Waiting for video…"}</span></div>}
    </div>
    <div className="flex flex-wrap items-center gap-2 p-3 text-sm"><strong className="break-all">{name || "Participant"}{participant.isLocal && " (you)"}</strong>
      {identity === hostUserId && <span className="rounded bg-blue-900 px-2 py-1">Host</span>}
      <span className="ml-auto text-slate-300">{microphoneMuted ? "Microphone muted" : "Microphone on"}</span>
    </div>
  </article>;
}
