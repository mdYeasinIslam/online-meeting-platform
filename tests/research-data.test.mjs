import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { vocabulary, sample, observation } from "./helpers/research-fixture.mjs";
import { validateVocabulary } from "../src/@modules/research/vocabulary.ts";
import { validateSample, assessQuality } from "../src/@modules/research/sample.ts";
import { temporalFrame } from "../src/@modules/research/frame.ts";
import { decodeBundle, encodeBundle, validateDataset, datasetStatistics } from "../src/@modules/research/dataset.ts";
import { checkLeakage, splitDataset } from "../src/@modules/research/split.ts";
const v = vocabulary();
test("default vocabulary is provisional; activation requires actual review fields", () => {
  const original = JSON.parse(readFileSync(new URL("../dataset/manifests/vocabulary.json", import.meta.url), "utf8"));
  assert.equal(validateVocabulary(original).labels.length, 12);
  assert.equal(original.labels.filter(l => l.active).length, 0);
  original.labels[0].active = true;
  assert.throws(() => validateVocabulary(original), /require review/);
  const duplicate = vocabulary(); duplicate.labels.push(duplicate.labels[0]);
  assert.throws(() => validateVocabulary(duplicate), /unique/);
  const unsafe = vocabulary(); unsafe.labels[0].referenceUrl = "javascript:alert(1)";
  assert.throws(() => validateVocabulary(unsafe));
});
test("one-hand and two-hand samples keep raw coordinates and masks", () => {
  const one = sample(); assert.equal(validateSample(one, v).quality.status, "accepted");
  const two = sample(); two.frames.forEach(f => { f.right = observation("Left"); f.validity.right = true; });
  assert.deepEqual(validateSample(two, v).sample.frames, two.frames);
  assert.equal(one.frames[0].left.landmarks[0].x, 0.2001);
});
test("handedness swaps unmirrored input; missing, low confidence and collisions remain unassigned", () => {
  const landmarks = observation().landmarks;
  const result = temporalFrame({ multiHandLandmarks: [landmarks, landmarks], multiHandedness: [{ index: 0, label: "Right", score: 0.9 }, { index: 1, label: "Left", score: 0.9 }] }, 123);
  assert.deepEqual(result.validity, { left: true, right: true });
  assert.equal(result.left.detectionConfidence, null);
  const unknown = temporalFrame({ multiHandLandmarks: [landmarks], multiHandedness: [] }, 0);
  assert.equal(unknown.unassigned.length, 1); assert.equal(unknown.left, null);
  const low = temporalFrame({ multiHandLandmarks: [landmarks], multiHandedness: [{ index: 0, label: "Right", score: 0.6 }] }, 0);
  assert.equal(low.unassigned.length, 1);
  const duplicate = temporalFrame({ multiHandLandmarks: [landmarks, landmarks], multiHandedness: [{ index: 0, label: "Left", score: 0.9 }, { index: 1, label: "Left", score: 0.9 }] }, 0);
  assert.equal(duplicate.right, null); assert.equal(duplicate.unassigned.length, 2);
  const empty = temporalFrame({ multiHandLandmarks: [], multiHandedness: [] }, 0);
  assert.deepEqual(empty.validity, { left: false, right: false });
});
const corruptions = [
  ["schema", s => { s.schemaVersion = 2; }], ["label", s => { s.labelId = "missing"; }],
  ["participant", s => { s.participantId = "Real Name"; }], ["session", s => { s.sessionId = ""; }],
  ["consent", s => { s.consent.confirmed = false; }], ["unexpected identity", s => { s.email = "person@example.com"; }],
  ["timestamp ordering", s => { s.frames[2].offsetMs = 0; }], ["timestamp outside duration", s => { s.frames[0].offsetMs = 6000; }],
  ["wrong landmark count", s => { s.frames[0].left.landmarks.pop(); }],
  ["NaN", s => { s.frames[0].left.landmarks[0].x = NaN; }], ["Infinity", s => { s.frames[0].left.landmarks[0].z = Infinity; }],
  ["tolerance", s => { s.frames[0].left.landmarks[0].y = 9; }], ["mask mismatch", s => { s.frames[0].validity.right = true; }],
  ["unreliable slot", s => { s.frames[0].left.handednessConfidence = 0.5; }], ["fabricated confidence", s => { s.frames[0].left.detectionConfidence = 0.9; }],
  ["raw metadata secret", s => { s.detector.token = "forbidden"; }],
];
for (const [name, modify] of corruptions) test(`reject ${name}`, () => { const s = sample(); modify(s); assert.ok(validateSample(s, v).errors.length); });
test("quality distinguishes accepted/warning/rejected and recomputes imported summaries", () => {
  const missing = sample(); missing.frames.forEach(f => { f.left = null; f.validity.left = false; });
  assert.match(validateSample(missing, v).errors.join(" "), /No hand detected/);
  const warn = sample(); warn.frames.slice(0, 20).forEach(f => { f.left = null; f.validity.left = false; });
  assert.equal(validateSample(warn, v).quality.status, "warning");
  const few = sample(); few.frames = few.frames.slice(0, 3);
  assert.match(validateSample(few, v).errors.join(" "), /Too few valid/);
  const sparse = sample(); sparse.frames = sparse.frames.filter((_, i) => i % 4 === 0);
  assert.match(validateSample(sparse, v).quality.reasons.join(" "), /Low effective/);
  const brief = sample(); brief.durationMs = 500; brief.endedAt = "2026-01-01T00:00:01.500Z"; brief.frames = brief.frames.slice(0, 5);
  assert.match(validateSample(brief, v).errors.join(" "), /duration/);
  assert.equal(assessQuality({ frames: [], durationMs: 4000 }, "two").status, "rejected");
});
test("bundle round-trip rejects extra metadata, limits, IDs and warns about identical motion", () => {
  const samples = [sample(), sample(2)];
  assert.deepEqual(validateDataset(decodeBundle(encodeBundle(samples, v)), v).samples, samples);
  assert.throws(() => decodeBundle('{"kind":"bdsl-temporal-landmarks","schemaVersion":1,"samples":[],"token":"x"}'));
  assert.throws(() => decodeBundle(" ".repeat(21 * 1024 * 1024)));
  assert.equal(validateDataset([sample(), sample()], v).rejected.length, 1);
  const copy = sample(); copy.id = sample(2).id;
  assert.match(validateDataset([sample(), copy], v).warnings[0].reasons.join(" "), /identical/);
});
function dataset() { return Array.from({ length: 18 }, (_, i) => sample(i + 1, `P${String(Math.floor(i / 2) + 1).padStart(3, "0")}`, i % 2 ? "S002" : "S001")); }
test("seeded grouped splits are order-independent, keep all sessions, and detect leakage", () => {
  const samples = dataset(); const first = splitDataset(samples, v, "seed-a");
  assert.deepEqual(splitDataset([...samples].reverse(), v, "seed-a"), first);
  assert.notDeepEqual(splitDataset(samples, v, "seed-b").splits, first.splits);
  assert.deepEqual(checkLeakage(first, samples), []);
  for (const group of Object.values(first.splits)) for (const participant of group.participants) assert.equal(group.sampleIds.filter(id => samples.find(s => s.id === id).participantId === participant).length, 2);
  assert.match(first.warnings.join(" "), /thanks is absent/);
  first.splits.test.participants.push(first.splits.train.participants[0]);
  assert.match(checkLeakage(first, samples).join(" "), /leakage/);
});
test("impossible splits and invalid ratios fail without inventing participants", () => {
  for (const samples of [[], [sample()], [sample(), sample(2, "P002")]]) assert.throws(() => splitDataset(samples, v, "seed"), /three participants/);
  assert.throws(() => splitDataset(dataset(), v, ""), /seed/);
  assert.throws(() => splitDataset(dataset(), v, "seed", [1, 0, 0]), /ratios/);
});
test("statistics use supplied samples, qualified sessions and empty values", () => {
  const report = datasetStatistics(validateDataset(dataset(), v));
  assert.equal(report.totalSamples, 18); assert.equal(report.participants, 9); assert.equal(report.sessions, 18);
  assert.equal(report.durationMs.mean, 4000); assert.equal(report.frameCount.mean, 40); assert.equal(report.effectiveFps.mean, 10);
  assert.equal(report.missingHandPercentage, 0);
  const empty = datasetStatistics(validateDataset([], v)); assert.equal(empty.totalSamples, 0); assert.equal(empty.durationMs.mean, null);
});
