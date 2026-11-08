import type { TemporalSample } from "../../src/@modules/research/types";
import { validateSample } from "../../src/@modules/research/sample.ts";
import type { Vocabulary } from "../../src/@modules/research/types";
import { AXES, COORDINATES, FEATURES, LANDMARKS, SLOTS, seeded, type Config } from "./config.ts";
export function labelMap(vocabulary: Vocabulary) {
  return vocabulary.labels.filter(label => label.active && label.reviewStatus === "reviewed").map((label, index) => ({ index, id: label.id, bangla: label.bangla }));
}
export interface Sequence { sampleId: string; participantId: string; sessionId: string; label: number; values: number[][]; geometric: { origin: number[]; scale: number }; }
export function preprocess(value: unknown, vocabulary: Vocabulary, config: Config): Sequence {
  const checked = validateSample(value, vocabulary);
  if (!checked.sample || checked.errors.length) throw new Error(`Sample rejected: ${checked.errors.join("; ")}`);
  const sample = checked.sample;
  const encoded = labelMap(vocabulary).find(label => label.id === sample.labelId);
  if (!encoded) throw new Error("Unknown or inactive label");
  return transform(sample, encoded.index, config);
}
function transform(sample: TemporalSample, label: number, config: Config): Sequence {
  // Day-4 validation rejects unordered/duplicate offsets; never silently repair raw captures.
  const frames = sample.frames;
  if (frames.length < 2 || frames.some((frame, i) => !Number.isFinite(frame.offsetMs) || (i > 0 && frame.offsetMs <= frames[i - 1].offsetMs))) throw new Error("Strictly increasing timestamps required");
  const first = frames.find(frame => frame.left || frame.right);
  if (!first) throw new Error("No reliably assigned hand");
  const wrists = SLOTS.flatMap(slot => first[slot] ? [first[slot]!.landmarks[0]] : []);
  const origin = ["x", "y", "z"].map(axis => wrists.reduce((sum, point) => sum + point[axis as "x" | "y" | "z"], 0) / wrists.length);
  let scale = 0;
  for (const frame of frames) for (const slot of SLOTS) for (const point of frame[slot]?.landmarks ?? []) [point.x, point.y, point.z].forEach((value, axis) => { scale = Math.max(scale, Math.abs(value - origin[axis])); });
  if (!Number.isFinite(scale) || scale <= config.minimumScale) throw new Error("Degenerate shared sample scale");
  let cursor = 0;
  const values = Array.from({ length: config.sequenceLength }, (_, i) => {
    const time = sample.durationMs * i / (config.sequenceLength - 1), row = Array(FEATURES).fill(0) as number[];
    while (cursor + 1 < frames.length && frames[cursor + 1].offsetMs < time) cursor++;
    const a = frames[cursor], b = frames[Math.min(cursor + 1, frames.length - 1)];
    const exact = Math.abs(time - a.offsetMs) < 1e-7 ? a : Math.abs(time - b.offsetMs) < 1e-7 ? b : null;
    for (const [slotIndex, slot] of SLOTS.entries()) {
      const start = exact ? exact[slot] : a[slot], end = exact ? exact[slot] : b[slot];
      if (!start || !end || (!exact && (time < a.offsetMs || time > b.offsetMs || b.offsetMs - a.offsetMs > config.maxInterpolationGapMs))) continue;
      const ratio = exact ? 0 : (time - a.offsetMs) / (b.offsetMs - a.offsetMs);
      for (let point = 0; point < LANDMARKS; point++) {
        const from = start.landmarks[point], to = end.landmarks[point];
        for (const [axis, name] of (["x", "y", "z"] as const).entries()) row[slotIndex * LANDMARKS * AXES + point * AXES + axis] = (from[name] + ratio * (to[name] - from[name]) - origin[axis]) / scale;
      }
      row[COORDINATES + slotIndex] = 1;
    }
    if (!row.every(Number.isFinite)) throw new Error("Non-finite derived features");
    return row;
  });
  if (values.filter(row => row[COORDINATES] || row[COORDINATES + 1]).length < config.minimumResampledValidFrames) throw new Error("Too few usable resampled frames; inspect capture gaps");
  return { sampleId: sample.id, participantId: sample.participantId, sessionId: sample.sessionId, label, values, geometric: { origin, scale } };
}
/** No fitted dataset statistics: geometric normalization is independent for each sample. */
export function normalizationState() { return { method: "none", fittedSampleIds: [] as string[], note: "No dataset means/std are fitted; each clip uses its own shared geometric origin/scale." }; }
export function augment(sequence: Sequence, split: "train" | "validation" | "test", config: Config, seed: number): Sequence {
  if (!config.augmentation.enabled) return structuredClone(sequence);
  if (split !== "train") throw new Error("Augmentation is training-only");
  const random = seeded(seed), result = structuredClone(sequence);
  for (const row of result.values) for (let i = 0; i < COORDINATES; i++) if (row[COORDINATES + Math.floor(i / (LANDMARKS * AXES))]) row[i] += (random() * 2 - 1) * config.augmentation.coordinateJitter;
  return result;
}
