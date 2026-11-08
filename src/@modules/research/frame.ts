import type { Results } from "@mediapipe/hands";
import { COLLECTION as C } from "./config.ts";
import type { HandObservation, TemporalFrame } from "./types.ts";

/** Copy only xyz and handedness; never retain Results.image, world points or video. */
export function temporalFrame(results: Pick<Results, "multiHandLandmarks" | "multiHandedness">, offsetMs: number): TemporalFrame {
  const frame: TemporalFrame = { offsetMs, left: null, right: null, unassigned: [], validity: { left: false, right: false } };
  const collided = new Set<"left" | "right">();
  for (const [index, points] of results.multiHandLandmarks.entries()) {
    const classification = results.multiHandedness[index];
    const label = classification?.label === "Left" || classification?.label === "Right" ? classification.label : null;
    const score = typeof classification?.score === "number" && Number.isFinite(classification.score) && classification.score >= 0 && classification.score <= 1 ? classification.score : null;
    const observation: HandObservation = { landmarks: points.map(({ x, y, z }) => ({ x, y, z })), reportedHandedness: label, handednessConfidence: score, detectionConfidence: null };
    if (!label || score === null || score < C.handednessThreshold) { frame.unassigned.push(observation); continue; }
    // MediaPipe assumes mirrored input; our detector sees unmirrored video.
    const slot = label === "Right" ? "left" : "right";
    if (frame[slot] || collided.has(slot)) {
      if (frame[slot]) frame.unassigned.push(frame[slot]);
      frame[slot] = null; collided.add(slot); frame.unassigned.push(observation);
    } else frame[slot] = observation;
  }
  frame.validity = { left: Boolean(frame.left), right: Boolean(frame.right) };
  return frame;
}
