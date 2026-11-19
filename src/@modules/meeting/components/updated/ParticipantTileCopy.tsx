"use client";

import { isTrackReference, useIsMuted, useParticipantInfo, VideoTrack, type TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { MicOff, VideoOff } from "lucide-react";
import { Track } from "livekit-client";

export default function ParticipantTileCopy({ trackRef, hostUserId }: { trackRef: TrackReferenceOrPlaceholder; hostUserId: string }) {
  const { participant } = trackRef;
  const { name, identity } = useParticipantInfo({ participant });
  const cameraMuted = useIsMuted(trackRef);
  const microphoneMuted = useIsMuted({ participant, source: Track.Source.Microphone });
  const videoAvailable = !cameraMuted && isTrackReference(trackRef) && !!trackRef.publication.track;
  const displayName = name || participant.name || "Participant";

  return (
    <article
      data-participant={identity}
      data-local={participant.isLocal}
      aria-label={`${displayName}${participant.isLocal ? " (you)" : ""}`}
      className="group relative h-full aspect-auto min-h-36 overflow-hidden rounded-2xl border border-white/10 bg-[#20232b] shadow-lg transition-[border-color,transform] duration-200 hover:border-white/25"
    >
      {videoAvailable && isTrackReference(trackRef) ? (
        <VideoTrack trackRef={trackRef} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#20232b]">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-600 text-2xl font-semibold text-white">
            {displayName.trim().slice(0, 1).toUpperCase()}
          </span>
          <span className="flex items-center gap-2 text-sm text-slate-300">
            <VideoOff size={16} aria-hidden="true" />
            {cameraMuted ? "Camera off" : "Waiting for video…"}
          </span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-3 pb-3 pt-8 text-sm">
        <span className="min-w-0 truncate font-medium">{displayName}{participant.isLocal && " (you)"}</span>
        {identity === hostUserId && <span className="shrink-0 rounded bg-blue-600/90 px-2 py-0.5 text-xs">Host</span>}
        {microphoneMuted && (
          <span className="ml-auto flex shrink-0 items-center gap-1 rounded bg-red-700/90 px-2 py-1 text-xs" aria-label="Microphone muted">
            <MicOff size={14} aria-hidden="true" /> Muted
          </span>
        )}
      </div>
    </article>
  );
}
