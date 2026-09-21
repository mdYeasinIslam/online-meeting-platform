"use client";
import { useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import ParticipantTile from "./ParticipantTile";

export default function ParticipantGrid({ hostUserId }: { hostUserId: string }) {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], { onlySubscribed: false });
  return <div>
    <p className="mb-2 text-sm text-slate-300" role="status">{tracks.length} / 7 participants</p>
    <div aria-label="Participant video area" className={`grid gap-3 ${tracks.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"} ${tracks.length > 4 ? "xl:grid-cols-3" : ""}`}>
      {tracks.map(track => <ParticipantTile key={track.participant.identity} trackRef={track} hostUserId={hostUserId} />)}
    </div>
  </div>;
}
