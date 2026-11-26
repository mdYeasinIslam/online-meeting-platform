import type { Results } from "@mediapipe/hands";
import { HandTrackingSession, type TrackingDependencies, type VideoSource } from "../research/hand-tracker.ts";
import { phraseFrame, type PhraseFrame } from "./preprocess.ts";

export interface TrackingDiagnostics {
  rawHands: number;
  acceptedHands: number;
  fps: number;
  handedness: { label: string; confidence: number; accepted: boolean }[];
}
export function trackingDiagnostics(results: Results, frame: PhraseFrame, fps: number): TrackingDiagnostics {
  const best = [-1, -1];
  const landmarks = results.multiHandLandmarks ?? [], handedness = results.multiHandedness ?? [];
  for (const [i, hand] of handedness.entries()) {
    const slot = hand.label === "Right" ? 0 : hand.label === "Left" ? 1 : -1;
    const points = landmarks[i];
    if (slot !== 0 && slot !== 1) continue;
    if (!frame.hands[slot] || !points || !Number.isFinite(hand.score)) continue;
    if (hand.score >= 0.8 && (best[slot] < 0 || hand.score > handedness[best[slot]].score) && points.length === 21 && points.every(point => [point.x, point.y, point.z].every(Number.isFinite))) best[slot] = i;
  }
  return {
    rawHands: landmarks.length,
    acceptedHands: frame.hands.filter(Boolean).length,
    fps,
    handedness: landmarks.map((_, i) => ({ label: handedness[i]?.label ?? "Unknown", confidence: handedness[i]?.score ?? 0, accepted: best.includes(i) })),
  };
}
/** Reuse research capture; bypass its collision filtering to preserve training slots. */
export class PhraseCamera extends HandTrackingSession {
  constructor(video: HTMLVideoElement, frame: (frame: PhraseFrame, capturedAt: number, diagnostics: TrackingDiagnostics, results: Results, mediaTimeMs?: number) => void, failure: (message: string) => void, dependencies?: TrackingDependencies, source?: VideoSource) {
    let first = 0, count = 0;
    super(video, (results, timestamp, mediaTimeMs) => {
      if (!count) first = timestamp;
      count++;
      const captured = phraseFrame(results, timestamp);
      const fps = count > 1 && timestamp > first ? (count - 1) * 1000 / (timestamp - first) : 0;
      frame(captured, timestamp, trackingDiagnostics(results, captured, fps), results, mediaTimeMs);
    }, failure, dependencies, source);
  }
}
