import type { TemporalFrame } from "./types.ts";
import { temporalFrame } from "./frame.ts";
import { HandTrackingSession, type TrackingDependencies } from "./hand-tracker.ts";

/** Preserve the research collector's assignment rules and public lifecycle API. */
export class ResearchCamera extends HandTrackingSession {
  constructor(video: HTMLVideoElement, frame: (frame: TemporalFrame, capturedAt: number) => void, failure: (message: string) => void, dependencies?: TrackingDependencies) {
    super(video, (results, timestamp) => frame(temporalFrame(results, 0), timestamp), failure, dependencies);
  }
}
