import { COLLECTION as C } from "./config.ts";
import { validateSample } from "./sample.ts";
import { array, choice, object } from "./validation.ts";
import type { DatasetCheck, TemporalSample, Vocabulary } from "./types.ts";

export function decodeBundle(input: string): unknown[] {
  if (new TextEncoder().encode(input).byteLength > C.maxFileBytes) throw new Error("Import exceeds 20 MiB.");
  const value: unknown = JSON.parse(input);
  const bundle = object(value, ["schemaVersion", "kind", "samples"], "Dataset bundle");
  choice(bundle.schemaVersion, [1], "Bundle schema"); choice(bundle.kind, ["bdsl-temporal-landmarks"], "Bundle kind");
  return array(bundle.samples, "Bundle samples", C.maxLocalSamples);
}
export function encodeBundle(samples: TemporalSample[], vocabulary: Vocabulary): string {
  const checked = validateDataset(samples, vocabulary);
  if (checked.rejected.length) throw new Error("Export blocked: resolve rejected or duplicate samples first.");
  if (samples.length > C.maxLocalSamples) throw new Error("Export queue exceeds the sample limit.");
  const json = JSON.stringify({ schemaVersion: 1, kind: "bdsl-temporal-landmarks", samples: checked.samples }, null, 2);
  if (new TextEncoder().encode(json).byteLength > C.maxFileBytes) throw new Error("Export exceeds 20 MiB; export smaller batches.");
  return json;
}
// Stable FNV pair for duplicate screening, not cryptographic integrity/identity.
export function motionFingerprint(sample: TemporalSample): string {
  const value = JSON.stringify(sample.frames.map(f => [f.left?.landmarks ?? null, f.right?.landmarks ?? null, f.unassigned.map(h => h.landmarks)]));
  let a = 2166136261, b = 5381;
  for (let i = 0; i < value.length; i++) { a = Math.imul(a ^ value.charCodeAt(i), 16777619); b = Math.imul(b, 33) ^ value.charCodeAt(i); }
  return `${value.length}-${a >>> 0}-${b >>> 0}`;
}
export function validateDataset(values: unknown[], vocabulary: Vocabulary): DatasetCheck {
  if (values.length > C.maxDatasetSamples) throw new Error("Dataset sample count exceeds safety limit.");
  const result: DatasetCheck = { total: values.length, samples: [], rejected: [], warnings: [] };
  const ids = new Set<string>(), fingerprints = new Set<string>();
  for (const [index, value] of values.entries()) {
    const check = validateSample(value, vocabulary);
    if (!check.sample || check.errors.length) { result.rejected.push({ index, reasons: check.errors }); continue; }
    const sample = check.sample;
    if (ids.has(sample.id)) { result.rejected.push({ index, reasons: ["Duplicate sample ID."] }); continue; }
    ids.add(sample.id);
    const fingerprint = motionFingerprint(sample);
    if (fingerprints.has(fingerprint)) {
      sample.quality = { ...sample.quality, status: "warning", reasons: [...sample.quality.reasons, "Suspiciously identical landmark sequence; review before training."] };
    }
    fingerprints.add(fingerprint);
    result.samples.push(sample);
    if (sample.quality.status === "warning") result.warnings.push({ id: sample.id, reasons: sample.quality.reasons });
  }
  return result;
}
export function counts(values: string[]): Record<string, number> {
  const result: Record<string, number> = Object.create(null);
  for (const value of values) result[value] = (result[value] ?? 0) + 1;
  return result;
}
function distribution(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return { count: values.length, min: sorted[0] ?? null, max: sorted.at(-1) ?? null, mean: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null, median: values.length ? (sorted[Math.floor((values.length - 1) / 2)] + sorted[Math.floor(values.length / 2)]) / 2 : null };
}
export function datasetStatistics(check: DatasetCheck) {
  const samples = check.samples;
  const frames = samples.reduce((n, s) => n + s.frames.length, 0);
  return {
    totalSamples: check.total, usableSamples: samples.length,
    participants: new Set(samples.map(s => s.participantId)).size,
    sessions: new Set(samples.map(s => `${s.participantId}/${s.sessionId}`)).size,
    perLabel: counts(samples.map(s => s.labelId)), perParticipant: counts(samples.map(s => s.participantId)),
    perSession: counts(samples.map(s => `${s.participantId}/${s.sessionId}`)),
    durationMs: distribution(samples.map(s => s.durationMs)), frameCount: distribution(samples.map(s => s.frames.length)),
    effectiveFps: distribution(samples.map(s => s.quality.effectiveFps)),
    missingHandPercentage: frames ? samples.reduce((n, s) => n + s.frames.length - s.quality.validFrames, 0) * 100 / frames : null,
    accepted: samples.length - check.warnings.length, warning: check.warnings.length, rejected: check.rejected.length,
    rejectionReasons: counts(check.rejected.flatMap(r => r.reasons)), warningReasons: counts(check.warnings.flatMap(r => r.reasons)),
    metricScope: "Structurally valid, non-rejected, unique samples only; total/rejected include all inputs.",
  };
}
