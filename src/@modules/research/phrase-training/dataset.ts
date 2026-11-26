import { COLLECTION as C, PARTICIPANT_ID, SESSION_ID, SAMPLE_ID } from "../config.ts";
import { array, choice, integer, iso, number, object, text } from "../validation.ts";
import { PHRASE, PHRASE_PREPROCESSING_VERSION as VERSION, preprocessPhrase, validatePhraseFeatures, type PhraseFrame } from "../../phrase-recognition/preprocess.ts";
import { PHRASE_LABELS, PHRASE_LABEL_IDS, PHRASE_VOCABULARY as V } from "./vocabulary.ts";
export const PHRASE_COLLECTION = { consentVersion: "phrase-pilot-consent-v1", minDurationMs: 2000, maxDurationMs: 8000, maxSamples: C.maxLocalSamples, batchBytes: 5 * 1024 * 1024, maxBytes: C.maxFileBytes } as const;
export interface PhraseQuality { status: "accepted" | "warning" | "rejected"; frameCount: number; validFrames: number; missingRatio: number; effectiveFps: number; maxGapMs: number; reasons: string[]; }
export interface PhraseMetadata {
  participantId: string; sessionId: string; label: number; consentAt: string; pilotAcknowledged: boolean;
  width: number; height: number; requestedDurationMs: number; countdownMs: number;
}
export function phraseDetector() { return { name: "@mediapipe/hands", version: C.detectorVersion, ...C.hands, handednessConfidence: 0.8, targetFps: C.targetFps }; }
export interface PhraseTrainingSample {
  id: string; participantId: string; sessionId: string; label: number; labelId: string;
  capturedAt: string; acceptedAt: string; durationMs: number; requestedDurationMs: number; countdownMs: number; stoppedBy: "manual" | "duration";
  preprocessingVersion: typeof VERSION; vocabularyVersion: string;
  detector: ReturnType<typeof phraseDetector>;
  orientation: { inputMirrored: false; previewMirrored: true; handedness: "swap-unmirrored"; width: number; height: number };
  consent: { confirmed: true; protocolVersion: string; confirmedAt: string };
  labelReview: { status: "provisional"; pilotAcknowledged: true };
  quality: PhraseQuality; values: number[][]; frames: PhraseFrame[];
}
export interface PhraseReview { sample: Omit<PhraseTrainingSample, "acceptedAt"> | null; quality: PhraseQuality; errors: string[]; }
export interface PhraseReceipt { id: string; fingerprint: string; label: number; }
export function validatePhraseMetadata(m: PhraseMetadata, now = Date.now()) {
  if (!PARTICIPANT_ID.test(m.participantId) || !SESSION_ID.test(m.sessionId)) throw new Error("Use pseudonymous participant/session IDs such as P001 / S001.");
  integer(m.label, "Class label", 0, 6); iso(m.consentAt, "Consent timestamp");
  if (Date.parse(m.consentAt) > now || m.pilotAcknowledged !== true) throw new Error("Consent and explicit provisional-pilot acknowledgement are required before capture.");
  choice(m.requestedDurationMs, [4000, 6000, 8000], "Recording duration");
  integer(m.countdownMs, "Countdown", 0, 10000);
  integer(m.width, "Video width", 1, 8192); integer(m.height, "Video height", 1, 8192);
}
export function phraseQuality(frames: readonly PhraseFrame[], durationMs: number): PhraseQuality {
  const validFrames = frames.filter(frame => frame.hands.some(Boolean)).length;
  const missingRatio = frames.length ? 1 - validFrames / frames.length : 1;
  const span = frames.length > 1 ? frames[frames.length - 1].timestamp - frames[0].timestamp : 0;
  const effectiveFps = span > 0 ? (frames.length - 1) * 1000 / span : 0;
  const maxGapMs = frames.reduce((max, frame, i) => Math.max(max, i ? frame.timestamp - frames[i - 1].timestamp : frame.timestamp), durationMs - (frames[frames.length - 1]?.timestamp ?? 0));
  const errors: string[] = [], warnings: string[] = [];
  if (durationMs < PHRASE_COLLECTION.minDurationMs || durationMs > PHRASE_COLLECTION.maxDurationMs) errors.push("Recording must last 2–8 seconds.");
  if (validFrames < 8 || missingRatio > 0.4) errors.push("Need at least eight valid hand frames and 60% hand coverage; no-hand takes are rejected, including unknown.");
  if (effectiveFps < C.rejectFps) errors.push("Effective capture FPS is too low.");
  else if (effectiveFps < C.warningFps) warnings.push("Low detector FPS; review temporal detail.");
  if (maxGapMs > 250) warnings.push("Capture gaps exceed 250 ms; shared preprocessing may reject interpolation.");
  return { status: errors.length ? "rejected" : warnings.length ? "warning" : "accepted", frameCount: frames.length, validFrames, missingRatio, effectiveFps, maxGapMs, reasons: [...errors, ...warnings] };
}
export function reviewPhraseCapture(m: PhraseMetadata, id: string, capturedAt: string, durationMs: number, stoppedBy: "manual" | "duration", frames: PhraseFrame[]): PhraseReview {
  const quality = phraseQuality(frames, durationMs), errors = quality.status === "rejected" ? [...quality.reasons] : [];
  let values: number[][] | undefined;
  try { values = preprocessPhrase(frames).map(row => Array.from(row)); }
  catch (error) { errors.push(error instanceof Error ? error.message : "Invalid phrase features."); }
  if (errors.length) return { sample: null, quality: { ...quality, status: "rejected" }, errors: [...new Set(errors)] };
  return { quality, errors: [], sample: {
    id, participantId: m.participantId, sessionId: m.sessionId, label: m.label, labelId: PHRASE_LABEL_IDS[m.label], capturedAt, durationMs,
    requestedDurationMs: m.requestedDurationMs, countdownMs: m.countdownMs, stoppedBy,
    preprocessingVersion: VERSION, vocabularyVersion: V.version, detector: phraseDetector(),
    orientation: { inputMirrored: false, previewMirrored: true, handedness: "swap-unmirrored", width: m.width, height: m.height },
    consent: { confirmed: true, protocolVersion: PHRASE_COLLECTION.consentVersion, confirmedAt: m.consentAt },
    labelReview: { status: "provisional", pilotAcknowledged: true }, quality, values: values!, frames: structuredClone(frames),
  } };
}
export function acceptPhraseReview(review: PhraseReview, acceptedAt = new Date().toISOString()): PhraseTrainingSample {
  if (!review.sample || review.errors.length || review.quality.status === "rejected") throw new Error("Rejected recordings cannot be accepted.");
  return validatePhraseSample({ ...review.sample, acceptedAt });
}
export function validatePhraseSample(input: unknown): PhraseTrainingSample {
  const s = object(input, ["id", "participantId", "sessionId", "label", "labelId", "capturedAt", "acceptedAt", "durationMs", "requestedDurationMs", "countdownMs", "stoppedBy", "preprocessingVersion", "vocabularyVersion", "detector", "orientation", "consent", "labelReview", "quality", "values", "frames"], "Phrase sample");
  const id = text(s.id, "Sample ID", 36); if (!SAMPLE_ID.test(id)) throw new Error("Invalid sample UUID.");
  const label = integer(s.label, "Class label", 0, 6);
  if (s.labelId !== PHRASE_LABEL_IDS[label]) throw new Error("Inconsistent class label / label ID.");
  choice(s.preprocessingVersion, [VERSION], "Preprocessing version"); choice(s.vocabularyVersion, [V.version], "Phrase vocabulary version");
  const capturedAt = iso(s.capturedAt, "Capture time"), acceptedAt = iso(s.acceptedAt, "Acceptance time");
  const durationMs = number(s.durationMs, "Duration", PHRASE_COLLECTION.minDurationMs, PHRASE_COLLECTION.maxDurationMs);
  const o = object(s.orientation, ["inputMirrored", "previewMirrored", "handedness", "width", "height"], "Orientation");
  choice(o.inputMirrored, [false], "Input mirror"); choice(o.previewMirrored, [true], "Preview mirror"); choice(o.handedness, ["swap-unmirrored"], "Handedness policy");
  const c = object(s.consent, ["confirmed", "protocolVersion", "confirmedAt"], "Consent");
  choice(c.confirmed, [true], "Consent"); choice(c.protocolVersion, [PHRASE_COLLECTION.consentVersion], "Consent protocol");
  const lr = object(s.labelReview, ["status", "pilotAcknowledged"], "Label review");
  choice(lr.status, ["provisional"], "Label review status"); choice(lr.pilotAcknowledged, [true], "Pilot acknowledgement");
  const metadata: PhraseMetadata = { participantId: text(s.participantId, "Participant", 7), sessionId: text(s.sessionId, "Session", 9), label, consentAt: iso(c.confirmedAt, "Consent time"), pilotAcknowledged: true, width: integer(o.width, "Width", 1, 8192), height: integer(o.height, "Height", 1, 8192), requestedDurationMs: integer(s.requestedDurationMs, "Requested duration"), countdownMs: integer(s.countdownMs, "Countdown") };
  validatePhraseMetadata(metadata, Date.parse(capturedAt));
  if (durationMs > metadata.requestedDurationMs || Date.parse(acceptedAt) < Date.parse(capturedAt) + durationMs) throw new Error("Inconsistent recording or acceptance times.");
  const stoppedBy = choice(s.stoppedBy, ["manual", "duration"], "Stop reason");
  if (stoppedBy === "duration" && durationMs !== metadata.requestedDurationMs) throw new Error("Automatic stop must match the requested duration.");
  const expectedDetector = phraseDetector(); const d = object(s.detector, Object.keys(expectedDetector), "Detector settings");
  for (const key of Object.keys(expectedDetector) as (keyof typeof expectedDetector)[]) if (d[key] !== expectedDetector[key]) throw new Error("Detector settings do not match phrase inference.");
  const frames = array(s.frames, "Raw phrase frames", PHRASE.maxFrames).map((value): PhraseFrame => {
    const f = object(value, ["timestamp", "hands"], "Raw frame");
    const hands = array(f.hands, "Hand slots", 2); if (hands.length !== 2) throw new Error("Expected left/right slots.");
    return { timestamp: number(f.timestamp, "Frame offset", 0, durationMs), hands: hands.map(value => {
      if (value === null) return null;
      const points = array(value, "Hand landmarks", 21); if (points.length !== 21) throw new Error("Expected 21 xyz landmarks.");
      return points.map(value => { const p = object(value, ["x", "y", "z"], "Landmark"); return { x: number(p.x, "x", -Number.MAX_VALUE, Number.MAX_VALUE), y: number(p.y, "y", -Number.MAX_VALUE, Number.MAX_VALUE), z: number(p.z, "z", -Number.MAX_VALUE, Number.MAX_VALUE) }; });
    }) as PhraseFrame["hands"] };
  });
  const values = array(s.values, "Features", 32).map(row => array(row, "Feature row", 128).map(n => number(n, "Feature coordinate", -Number.MAX_VALUE, Number.MAX_VALUE)));
  validatePhraseFeatures(values);
  if (values.some(row => row.some(n => Math.fround(n) !== n))) throw new Error("Features must be float32 numeric values.");
  const reviewed = reviewPhraseCapture(metadata, id, capturedAt, durationMs, stoppedBy, frames);
  if (!reviewed.sample || reviewed.errors.length) throw new Error(reviewed.errors.join(" "));
  if (values.some((row, i) => row.some((n, j) => n !== reviewed.sample!.values[i][j]))) throw new Error("Features do not match raw frames and shared preprocessing.");
  const q = object(s.quality, Object.keys(reviewed.quality), "Quality");
  for (const key of Object.keys(reviewed.quality) as (keyof PhraseQuality)[]) if (JSON.stringify(q[key]) !== JSON.stringify(reviewed.quality[key])) throw new Error("Quality metrics do not match raw capture.");
  return { ...reviewed.sample, acceptedAt };
}
export function phraseFingerprint(sample: Pick<PhraseTrainingSample, "values">): string {
  const source = JSON.stringify(sample.values); let a = 2166136261, b = 5381;
  for (let i = 0; i < source.length; i++) { a = Math.imul(a ^ source.charCodeAt(i), 16777619); b = Math.imul(b, 33) ^ source.charCodeAt(i); }
  return `${source.length}-${a >>> 0}-${b >>> 0}`;
}
export function phraseReceipt(sample: PhraseTrainingSample): PhraseReceipt { return { id: sample.id, fingerprint: phraseFingerprint(sample), label: sample.label }; }
export function validatePhraseQueue(inputs: readonly unknown[], archived: readonly PhraseReceipt[] = []): PhraseTrainingSample[] {
  if (inputs.length > PHRASE_COLLECTION.maxSamples) throw new Error("Queue is full (100 samples). Export and remove a saved batch; the pending take is retained.");
  const ids = new Set(archived.map(s => s.id)), motions = new Set(archived.map(s => s.fingerprint));
  return inputs.map(input => {
    const sample = validatePhraseSample(input), fingerprint = phraseFingerprint(sample);
    if (ids.has(sample.id)) throw new Error("Duplicate sample ID.");
    if (motions.has(fingerprint)) throw new Error("Duplicate motion sequence, including across labels or exported batches.");
    ids.add(sample.id); motions.add(fingerprint); return sample;
  });
}
function bundle(samples: readonly PhraseTrainingSample[]) {
  return { schemaVersion: 1, kind: "bdsl-phrase-training", preprocessingVersion: VERSION, inputShape: [32, 128], vocabularyVersion: V.version, vocabularyReviewStatus: "provisional", labels: PHRASE_LABELS, labelIds: PHRASE_LABEL_IDS, samples };
}
export function encodePhraseBundle(samples: readonly PhraseTrainingSample[], maxBytes: number = PHRASE_COLLECTION.maxBytes): string {
  const json = JSON.stringify(bundle(validatePhraseQueue(samples)));
  if (new TextEncoder().encode(json).byteLength > maxBytes) throw new Error("Queue exceeds export byte limit. Export smaller batches; the pending take is retained.");
  return json;
}
export function decodePhraseBundle(source: string): PhraseTrainingSample[] {
  if (new TextEncoder().encode(source).byteLength > PHRASE_COLLECTION.maxBytes) throw new Error("Phrase import exceeds 20 MiB.");
  const b = object(JSON.parse(source), ["schemaVersion", "kind", "preprocessingVersion", "inputShape", "vocabularyVersion", "vocabularyReviewStatus", "labels", "labelIds", "samples"], "Phrase bundle");
  choice(b.schemaVersion, [1], "Bundle schema"); choice(b.kind, ["bdsl-phrase-training"], "Bundle kind"); choice(b.preprocessingVersion, [VERSION], "Preprocessing"); choice(b.vocabularyVersion, [V.version], "Vocabulary"); choice(b.vocabularyReviewStatus, ["provisional"], "Vocabulary review");
  if (JSON.stringify(b.inputShape) !== "[32,128]") throw new Error("Expected [32,128] input shape.");
  for (const [key, expected] of [["labels", PHRASE_LABELS], ["labelIds", PHRASE_LABEL_IDS]] as const) {
    const mapping = object(b[key], Object.keys(expected), key);
    for (const index of Object.keys(expected)) if (mapping[index] !== expected[index]) throw new Error("Inconsistent label mapping.");
  }
  return validatePhraseQueue(array(b.samples, "Samples", PHRASE_COLLECTION.maxSamples));
}
/** Explicitly downloadable parts. Never clear samples just because a download began. */
export function phraseExportBatches(samples: readonly PhraseTrainingSample[], maxBytes: number = PHRASE_COLLECTION.maxBytes, maxSamples: number = PHRASE_COLLECTION.maxSamples): PhraseTrainingSample[][] {
  const checked = validatePhraseQueue(samples), batches: PhraseTrainingSample[][] = []; let batch: PhraseTrainingSample[] = [];
  for (const sample of checked) {
    if (batch.length >= maxSamples || new TextEncoder().encode(JSON.stringify(bundle([...batch, sample]))).byteLength > maxBytes) {
      if (!batch.length) throw new Error("A sample exceeds the export size limit."); batches.push(batch); batch = [];
    }
    batch.push(sample);
    if (new TextEncoder().encode(JSON.stringify(bundle(batch))).byteLength > maxBytes) throw new Error("A sample exceeds the export size limit.");
  }
  if (batch.length) batches.push(batch); return batches;
}
