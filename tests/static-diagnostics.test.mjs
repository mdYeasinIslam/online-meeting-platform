import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as tf from '@tensorflow/tfjs';
import { validateLabels, extractFeatures, decodeProbabilities } from '../src/@modules/sign-recognition/diagnostics.ts';
import { StaticHandSelector } from '../src/@modules/sign-recognition/hand-selection.ts';
import { StaticAlphabetEngine } from '../src/@modules/sign-recognition/static-engine.ts';
import { PredictionStabilizer } from '../src/@modules/sign-recognition/stabilizer.ts';
import { loadStaticLayersModel } from '../src/@modules/sign-recognition/model-loader.ts';
import { syntheticHand } from '../scripts/lib/static-probes.ts';
const labelMap = JSON.parse(fs.readFileSync(new URL('../public/model/labels.json', import.meta.url)));
const labels = validateLabels(labelMap);
const manifest = JSON.parse(fs.readFileSync(new URL('../public/model/model.json', import.meta.url)));
const raw = fs.readFileSync(new URL('../public/model/group1-shard1of1.bin', import.meta.url));
const bytes = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
const specs = manifest.weightsManifest[0].weights;
const handler = (weightSpecs = specs, weightData = bytes) => tf.io.fromMemory({ modelTopology: manifest.modelTopology, weightSpecs, weightData });
function hand(side, offset = 0) { return { side, confidence: 0.98, landmarks: syntheticHand().map(p => ({ ...p, x: p.x + offset })) }; }
test('36 unique Bengali runtime labels map each output index without sorting (training order remains unknown)', () => {
  assert.equal(labels.length, 36); assert.equal(new Set(labels).size, 36); assert.equal(labels[4], 'উ');
  for (let index = 0; index < 36; index++) {
    const scores = Array(36).fill(0); scores[index] = 1;
    const decoded = decodeProbabilities(scores, labels);
    assert.equal(decoded.winner.index, index); assert.equal(decoded.winner.label, labelMap[String(index)]);
  }
  for (const invalid of [{ ...labelMap, 1: labelMap[0] }, { ...labelMap, 36: 'ক' }, { ...labelMap, 4: 'English' }, Object.values(labelMap)]) assert.throws(() => validateLabels(invalid));
});
test('feature indices are exactly 3*i+x/y/z; dtype and [1,63] tensor shape are explicit', () => {
  const points = Array.from({ length: 21 }, (_, i) => ({ x: 2 + i, y: 3 - 2 * i, z: 4 + 3 * i }));
  const result = extractFeatures(points); assert.ok(!result.error);
  for (let i = 0; i < 21; i++) assert.deepEqual(result.values.slice(i * 3, i * 3 + 3), [i / 60, -2 * i / 60 || 0, 3 * i / 60]);
  const tensor = tf.tensor2d([result.values], [1, 63], 'float32');
  assert.equal(tensor.dtype, 'float32'); assert.deepEqual(tensor.shape, [1, 63]); tensor.dispose();
  assert.equal(result.summary.length, 63); assert.ok(result.values.every(Number.isFinite));
});
test('normalization rejects missing, coincident, tiny and non-finite geometry without replacing the formula', () => {
  for (const points of [[], syntheticHand().slice(1), Array.from({ length: 21 }, () => ({ x: 1, y: 1, z: 1 })), syntheticHand().map(p => ({ x: p.x * 1e-10, y: p.y * 1e-10, z: p.z * 1e-10 })), syntheticHand().map((p, i) => i === 3 ? { ...p, z: NaN } : p), syntheticHand().map((p, i) => i === 3 ? { ...p, x: Infinity } : p)]) assert.ok(extractFeatures(points).error);
  for (const points of [syntheticHand().map(p => ({ ...p, z: p.z * 1e8 })), syntheticHand().map(p => ({ ...p, x: p.x - 1 }))]) {
    const result = extractFeatures(points); assert.ok(!result.error); assert.ok(result.values.every(v => Number.isFinite(v) && Math.abs(v) <= 1));
  }
});
test('one hand is selected continuously when detector order reverses; missing metadata is safe', () => {
  const selector = new StaticHandSelector(), left = hand('left', -0.2), right = hand('right', 0.2);
  assert.deepEqual(selector.select([left, right]), { index: 0, changed: false });
  assert.deepEqual(selector.select([right, left]), { index: 1, changed: false });
  assert.deepEqual(selector.select([right]), { index: 0, changed: true });
  assert.deepEqual(selector.select([]), { index: null, changed: false });
  assert.equal(selector.select([{ side: 'unknown', landmarks: syntheticHand() }]).index, 0);
  selector.reset(); assert.equal(selector.select([{ ...left, landmarks: [] }, right]).index, 1);
});
test('probability output rejects malformed, non-finite and non-normalized outputs; top-k sorts ties deterministically', () => {
  for (const scores of [[], Array(35).fill(1 / 35), Array(36).fill(1), Array(36).fill(NaN), Array(36).fill(Infinity), [-1, 2, ...Array(34).fill(0)]]) assert.ok(decodeProbabilities(scores, labels).error);
  const result = decodeProbabilities(Array(36).fill(1 / 36), labels);
  assert.deepEqual(result.top5.map(p => p.index), [0, 1, 2, 3, 4]); assert.ok(Math.abs(result.sum - 1) < 1e-6);
});
test('strict weights reject duplicate names, wrong shape, NaN and truncated bytes without tensor leaks', async () => {
  const before = tf.memory().numTensors;
  const corrupt = bytes.slice(0); new Float32Array(corrupt)[0] = NaN;
  for (const source of [handler(specs.map((s, i) => i === 1 ? { ...s, name: specs[0].name } : s)), handler(specs.map((s, i) => i === 8 ? { ...s, shape: [64, 126] } : s)), handler(specs, corrupt), handler(specs, bytes.slice(0, -4))]) await assert.rejects(loadStaticLayersModel(source));
  assert.equal(tf.memory().numTensors, before);
});
test('stabilizer diagnoses warmup/acceptance/duplicate/reset without favoring উ or retaining it for a different raw winner', () => {
  const s = new PredictionStabilizer({ cooldownMs: 0 });
  const push = (text, timestamp, extra = {}) => s.push({ state: 'prediction', text, confidence: 0.99, timestamp, ...extra });
  for (let i = 0; i < 7; i++) assert.equal(push('উ', i), null);
  assert.equal(s.snapshot().reason, 'warming-up'); assert.equal(push('উ', 7).text, 'উ');
  assert.equal(push('উ', 8), null); assert.equal(s.snapshot().reason, 'duplicate-suppressed');
  let accepted;
  for (let i = 9; i < 17; i++) { const result = push('আ', i); if (result) accepted = result; }
  assert.equal(accepted.text, 'আ');
  s.push({ state: 'no-hand', timestamp: 20 }); assert.deepEqual(s.snapshot().window, []);
  s.push({ state: 'no-hand', timestamp: 600 });
  for (let i = 0; i < 8; i++) accepted = push('আ', 700 + i);
  assert.equal(accepted.text, 'আ');
  push('উ', 800, { diagnostics: { handChanged: true } }); assert.deepEqual(s.snapshot().window, ['উ']);
  s.reset(); assert.equal(s.snapshot().reason, 'reset'); assert.deepEqual(s.snapshot().window, []);
});
test('real engine loads once concurrently; invalid/no-hand frames never infer; diagnostics do not change predictions', async () => {
  const originalFetch = globalThis.fetch, counts = new Map(), before = tf.memory().numTensors;
  // Only the external asset transport is substituted. Actual saved weights and inference run.
  globalThis.fetch = async input => {
    const path = typeof input === 'string' ? input : input.url;
    counts.set(path, (counts.get(path) || 0) + 1);
    const name = path.split('/').at(-1);
    return new Response(fs.readFileSync(new URL(`../public/model/${name}`, import.meta.url)), { status: 200, headers: { 'Content-Type': name.endsWith('.json') ? 'application/json' : 'application/octet-stream' } });
  };
  const engine = new StaticAlphabetEngine();
  try {
    assert.equal((await engine.predict({ hands: [], timestamp: 0 })).state, 'no-hand');
    await Promise.all([engine.load(), engine.load(), engine.load()]);
    assert.ok([...counts.values()].every(n => n === 1));
    assert.equal((await engine.predict({ hands: [{ side: 'unknown', landmarks: [] }], timestamp: 1 })).state, 'unknown');
    assert.equal((await engine.predict({ hands: [{ side: 'unknown', landmarks: Array(21).fill({ x: 0, y: 0, z: 0 }) }], timestamp: 2 })).state, 'unknown');
    const frame = { hands: [hand('left')], timestamp: 3 };
    const first = await engine.predict(frame), second = await engine.predict(frame);
    assert.equal(first.text, second.text); assert.equal(first.confidence, second.confidence); assert.deepEqual(first.diagnostics.top5, second.diagnostics.top5);
    assert.equal(first.diagnostics.features.length, 63); assert.equal(first.diagnostics.top5.length, 5);
    const loaded = tf.memory().numTensors;
    for (let i = 0; i < 100; i++) await engine.predict(frame);
    assert.equal(tf.memory().numTensors, loaded);
  } finally { engine.dispose(); globalThis.fetch = originalFetch; }
  assert.equal(tf.memory().numTensors, before);
});
