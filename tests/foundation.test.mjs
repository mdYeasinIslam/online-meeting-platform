import test from "node:test";
import assert from "node:assert/strict";
import { safeReturnPath } from "../src/@modules/auth/libs/return-path.ts";
import { PredictionStabilizer } from "../src/@modules/sign-recognition/stabilizer.ts";
import { normalizeLandmarks } from "../src/@modules/sign-recognition/normalization.ts";
import { appendCaption } from "../src/@modules/captions/feed.ts";
test("meeting destinations survive authentication without open redirects", () => {
  const path = "/meeting/524ad042-e10d-4edc-93c0-62d1f32ce54f";
  assert.equal(safeReturnPath(path), path);
  for (const value of ["https://evil.example", "//evil.example", "/meeting/invalid", null, [path]]) assert.equal(safeReturnPath(value), "/dashboard");
});
const prediction = (text, timestamp, confidence = 0.95) => ({ state: "prediction", text, timestamp, confidence });
test("stabilization requires consensus, suppresses duplicates, handles no-hand and cooldown", () => {
  const s = new PredictionStabilizer({ windowSize: 3, majorityRatio: 2 / 3, cooldownMs: 100, noHandResetMs: 50 });
  assert.equal(s.push(prediction("ক", 0)), null); assert.equal(s.push(prediction("খ", 10)), null);
  assert.deepEqual(s.push(prediction("ক", 20)), { text: "ক", timestamp: 20 });
  assert.equal(s.push(prediction("ক", 200)), null);
  s.push({ state: "no-hand", timestamp: 210 }); s.push({ state: "no-hand", timestamp: 270 });
  s.push(prediction("ক", 280)); s.push(prediction("ক", 290));
  assert.deepEqual(s.push(prediction("ক", 300)), { text: "ক", timestamp: 300 });
  s.push(prediction("খ", 310)); assert.equal(s.push(prediction("খ", 320)), null); assert.equal(s.push(prediction("খ", 330)), null);
  assert.deepEqual(s.push(prediction("খ", 410)), { text: "খ", timestamp: 410 });
});
test("low confidence and unknown frames break stability", () => {
  const s = new PredictionStabilizer({ windowSize: 2 });
  s.push(prediction("ক", 0)); s.push(prediction("ক", 10, 0.1)); assert.equal(s.push(prediction("ক", 20)), null);
  s.push({ state: "unknown", timestamp: 30 }); assert.equal(s.push(prediction("ক", 40)), null);
  assert.throws(() => new PredictionStabilizer({ windowSize: 0 }));
});
test("normalization preserves translation/scale invariance and handles zero span", () => {
  const points = Array.from({ length: 21 }, (_, i) => ({ x: i, y: i * 2, z: -i }));
  const moved = points.map(p => ({ x: p.x * 3 + 10, y: p.y * 3 - 10, z: p.z * 3 + 2 }));
  assert.equal(normalizeLandmarks(points).length, 63); assert.deepEqual(normalizeLandmarks(points), normalizeLandmarks(moved));
  assert.deepEqual(normalizeLandmarks(Array.from({ length: 21 }, () => ({ x: 1, y: 1, z: 1 }))), Array(63).fill(0));
});
test("caption feed deduplicates IDs, bounds history and accepts both sources", () => {
  const first = { id: "1", participantId: "user", participantName: "Rahim", source: "sign", text: "পানি", timestamp: Date.now() };
  const history = appendCaption([], first, 2);
  assert.equal(appendCaption(history, { ...first, text: "duplicate" }, 2).length, 1);
  const next = appendCaption(history, { ...first, id: "2", source: "speech" }, 2);
  assert.deepEqual(appendCaption(next, { ...first, id: "3" }, 2).map(item => item.id), ["2", "3"]);
  assert.equal(appendCaption(next, { ...first, id: "4", text: "" }, 2).length, 2);
});
