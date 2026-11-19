"use client";

import { useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import type { CSSProperties } from "react";
import ParticipantTileCopy from "./ParticipantTileCopy";

function columnsFor(count: number) {
  if (count <= 1) return 1;
  if (count <= 4) return 2;
  if (count <= 8) return Math.min(4, Math.ceil(Math.sqrt(count)));
  return Math.min(5, Math.ceil(Math.sqrt(count)));
}

export default function ParticipantGridCopy({
  hostUserId,
}: {
  hostUserId: string;
}) {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );
  const columns = columnsFor(tracks.length);
  const rows = Math.max(1, Math.ceil(tracks.length / columns));
  const style = {
    "--participant-columns": `repeat(${columns}, minmax(0, 1fr))`,
    "--participant-rows": `repeat(${rows}, minmax(0, 1fr))`,
  } as CSSProperties;

  return (
    <section
      className="flex min-h-0 flex-1 flex-col"
      aria-label="Meeting participants"
    >
      <div className="mb-2 flex shrink-0 items-center justify-between px-1 text-xs text-slate-300">
        <p role="status">
          {tracks.length} {tracks.length === 1 ? "participant" : "participants"}
        </p>
        {tracks.length > 0 && <p>Live meeting</p>}
      </div>
      <div
        aria-label="Participant video area"
        className="grid min-h-0 flex-1 grid-cols-1 content-stretch gap-2 overflow-y-auto pb-24 transition-[grid-template-columns,grid-template-rows] duration-300 ease-in-out sm:grid-cols-2 lg:grid-cols-[var(--participant-columns)] lg:grid-rows-[var(--participant-rows)]"
        style={style}
      >
        {tracks.map((track) => (
          <ParticipantTileCopy
            key={track.participant.identity}
            trackRef={track}
            hostUserId={hostUserId}
          />
        ))}
        {!tracks.length && (
          <p className="m-auto text-slate-300">Waiting for participants…</p>
        )}
      </div>
    </section>
  );
}
