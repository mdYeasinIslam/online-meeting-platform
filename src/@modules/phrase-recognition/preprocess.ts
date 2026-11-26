import type { Results } from "@mediapipe/hands";

export const PHRASE_PREPROCESSING_VERSION = "phrase-frame-index-v1" as const;

export const PHRASE = {
  sequenceLength: 32,
  features: 128,
  maxDurationMs: 12000,
  maxFrames: 900,
  confidenceThreshold: 0.8,
} as const;
export type Point = { x: number; y: number; z: number };
export type PhraseFrame = {
  timestamp: number;
  hands: [Point[] | null, Point[] | null];
};
const axes = ["x", "y", "z"] as const;
const validHand = (points: Point[]) =>
  points.length === 21 &&
  points.every((p) => p && axes.every((axis) => Number.isFinite(p[axis])));

/** Exact slot selection from phrase-pilot/extract.py. Input pixels MUST be unmirrored. */
export function phraseFrame(
  results: Pick<Results, "multiHandLandmarks" | "multiHandedness">,
  timestamp: number,
): PhraseFrame {
  const hands: PhraseFrame["hands"] = [null, null],
    scores = [0, 0];
  for (const [i, points] of (results.multiHandLandmarks ?? []).entries()) {
    const classification = results.multiHandedness?.[i];
    if (!classification || !["Right", "Left"].includes(classification.label))
      continue;
    const slot = classification.label === "Right" ? 0 : 1;
    if (
      Number.isFinite(classification.score) &&
      classification.score >= 0.8 &&
      classification.score > scores[slot] &&
      validHand(points)
    ) {
      hands[slot] = points.map(({ x, y, z }) => ({ x, y, z }));
      scores[slot] = classification.score;
    }
  }
  return { timestamp, hands };
}

/** Bounded, timestamped capture, including no-hand frames; never stores camera images. */
export class PhraseBuffer {
  readonly frames: PhraseFrame[] = [];
  readonly startedAt: number;
  readonly maxDurationMs: number;
  constructor(startedAt: number, maxDurationMs: number = PHRASE.maxDurationMs) {
    this.startedAt = startedAt;
    this.maxDurationMs = maxDurationMs;
    if (
      !Number.isFinite(startedAt) ||
      !Number.isFinite(maxDurationMs) ||
      maxDurationMs <= 0
    )
      throw new Error("Invalid recording duration.");
  }
  push(frame: PhraseFrame) {
    if (
      frame.timestamp < this.startedAt ||
      frame.timestamp - this.startedAt > this.maxDurationMs ||
      this.frames.length >= PHRASE.maxFrames
    )
      return false;
    if (
      !Number.isFinite(frame.timestamp) ||
      (this.frames.length &&
        frame.timestamp <= this.frames[this.frames.length - 1].timestamp)
    )
      return false;
    this.frames.push(frame);
    return true;
  }
}

/** Python uses linspace over frame INDICES, not elapsed-time interpolation. */
export function preprocessPhrase(
  frames: readonly PhraseFrame[],
): Float32Array[] {
  if (frames.length < 2 || frames.length > PHRASE.maxFrames)
    throw new Error("Too few or too many captured frames.");
  for (const [i, frame] of frames.entries()) {
    if (
      !Number.isFinite(frame.timestamp) ||
      (i > 0 && frame.timestamp <= frames[i - 1].timestamp)
    )
      throw new Error("Strictly increasing timestamps required.");
    if (
      !Array.isArray(frame.hands) ||
      frame.hands.length !== 2 ||
      frame.hands.some(
        (hand) => hand !== null && (!Array.isArray(hand) || !validHand(hand)),
      )
    )
      throw new Error("Invalid hand landmarks.");
  }
  const valid = frames.filter((frame) => frame.hands.some(Boolean));
  if (valid.length < 8 || valid.length / frames.length < 0.6)
    throw new Error(
      "Insufficient hand landmarks: need at least 8 valid frames and 60% hand coverage.",
    );
  const wrists = valid[0].hands.flatMap((hand) => (hand ? [hand[0]] : []));
  const origin = axes.map(
    (axis) => wrists.reduce((sum, p) => sum + p[axis], 0) / wrists.length,
  );
  let scale = 0;
  for (const frame of frames)
    for (const hand of frame.hands)
      for (const point of hand ?? [])
        axes.forEach((axis, a) => {
          scale = Math.max(scale, Math.abs(point[axis] - origin[a]));
        });
  if (!Number.isFinite(scale) || scale < 1e-8)
    throw new Error("Degenerate landmarks.");
  const step = (frames.length - 1) / 31;
  const values = Array.from({ length: 32 }, (_, j) => {
    const t = j === 31 ? frames.length - 1 : j * step;
    const lo = Math.floor(t),
      hi = Math.ceil(t),
      w = t - lo;
    const row = new Float32Array(128);
    for (let k = 0; k < 2; k++) {
      const x = frames[lo].hands[k],
        y = frames[hi].hands[k];
      // At constant FPS this equals Python's (hi-lo)*1000/fps. Live capture
      // uses the measured adjacent-frame gap to avoid filling detector stalls.
      if (!x || !y || frames[hi].timestamp - frames[lo].timestamp > 250)
        continue;
      for (let p = 0; p < 21; p++)
        axes.forEach((axis, a) => {
          row[k * 63 + p * 3 + a] =
            ((1 - w) * x[p][axis] + w * y[p][axis] - origin[a]) / scale;
        });
      row[126 + k] = 1;
    }
    return row;
  });
  if (values.filter((row) => row[126] || row[127]).length < 8)
    throw new Error(
      "Too few resampled hand frames; please record again without long capture gaps.",
    );
  validatePhraseFeatures(values);
  return values;
}
export function validatePhraseFeatures(values: readonly ArrayLike<number>[]) {
  if (
    values.length !== 32 ||
    values.some(
      (row) => row.length !== 128 || !Array.from(row).every(Number.isFinite),
    )
  )
    throw new Error("Expected finite [32,128] features.");
  if (
    values.some(
      (row) =>
        ![0, 1].includes(row[126]) ||
        ![0, 1].includes(row[127]) ||
        Array.from(row)
          .slice(0, 126)
          .some((n, i) => row[126 + Math.floor(i / 63)] === 0 && n !== 0),
    )
  )
    throw new Error("Invalid hand masks or missing-hand coordinates.");
  if (values.filter((row) => row[126] || row[127]).length < 8)
    throw new Error("Empty or insufficient feature sequence.");
}
