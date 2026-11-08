import test from "node:test";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { TemporalRecorder } from "../src/@modules/research/recorder.ts";
import { ResearchCamera } from "../src/@modules/research/camera.ts";
import { sample, vocabulary } from "./helpers/research-fixture.mjs";

test("recording gates, countdown, monotonic frames, review, cancel and disposal", () => {
  let now = 0, timer = null, updates = 0;
  const recorder = new TemporalRecorder(() => { updates++; }, { now: () => now, date: () => 1767225601000 + now, id: () => sample().id, schedule: callback => { assert.equal(timer, null); timer = callback; return 1; }, cancel: () => { timer = null; } });
  const meta = { participantId: "P001", sessionId: "S001", take: 1, vocabularyVersion: "synthetic-tests-only", label: vocabulary().labels[0], consentAt: "2026-01-01T00:00:00.000Z", width: 640, height: 480 };
  assert.throws(() => recorder.start(meta, false));
  assert.throws(() => recorder.start({ ...meta, consentAt: "" }, true));
  recorder.start(meta, true); assert.equal(recorder.snapshot.phase, "countdown");
  assert.throws(() => recorder.start(meta, true));
  const tick = t => { now = t; const fn = timer; timer = null; fn(); };
  tick(3000); assert.equal(recorder.snapshot.phase, "recording");
  sample().frames.forEach(f => recorder.capture(f, 3000 + f.offsetMs));
  recorder.capture(sample().frames[0], 3000); // duplicate timestamp ignored
  tick(7000); assert.equal(recorder.snapshot.phase, "review");
  assert.equal(recorder.snapshot.sample.frames.length, 40); assert.equal(recorder.snapshot.sample.quality.status, "accepted");
  recorder.cancel(); recorder.start(meta, true); recorder.cancel(); assert.equal(timer, null);
  recorder.start(meta, true); recorder.dispose(); assert.equal(timer, null);
  const before = updates; recorder.capture(sample().frames[0], now); assert.equal(updates, before);
  assert.throws(() => recorder.start(meta, true));
});
function cameraFixture() {
  let creates = 0, gets = 0, active = 0, maxActive = 0, sends = 0, closed = 0, stopped = 0, listeners = 0;
  let resultCallback;
  const handlers = new Set();
  const track = { stop: () => { stopped++; }, addEventListener: (_, fn) => { handlers.add(fn); listeners = handlers.size; }, removeEventListener: (_, fn) => { handlers.delete(fn); listeners = handlers.size; } };
  const stream = { getTracks: () => [track] };
  const video = { srcObject: null, readyState: 2, play: async () => {}, pause: () => {} };
  const detector = { setOptions: options => { assert.equal(options.selfieMode, false); }, onResults: callback => { resultCallback = callback; }, initialize: async () => {}, send: async () => { sends++; active++; maxActive = Math.max(maxActive, active); await delay(5); resultCallback({ multiHandLandmarks: [], multiHandedness: [] }); active--; }, close: async () => { closed++; } };
  const dependencies = { camera: async () => { gets++; return stream; }, detector: async () => { creates++; return detector; }, now: () => performance.now() };
  return { video, stream, dependencies, stats: () => ({ creates, gets, active, maxActive, sends, closed, stopped, listeners }) };
}
test("one detector/camera initialization and frame loop; dispose releases every resource", async () => {
  const fixture = cameraFixture(); let frames = 0;
  const camera = new ResearchCamera(fixture.video, () => { frames++; }, message => assert.fail(message), fixture.dependencies);
  await Promise.all([camera.start(), camera.start(), camera.start()]);
  await delay(220);
  await Promise.all([camera.dispose(), camera.dispose()]);
  const count = frames; await delay(120);
  assert.equal(frames, count); assert.ok(count >= 2);
  const stats = fixture.stats(); assert.equal(stats.gets, 1); assert.equal(stats.creates, 1); assert.equal(stats.maxActive, 1); assert.equal(stats.closed, 1); assert.equal(stats.listeners, 0); assert.ok(stats.stopped >= 1); assert.equal(fixture.video.srcObject, null);
});
test("unmount while permission is pending stops the late camera without detector startup", async () => {
  const fixture = cameraFixture(); let release;
  fixture.dependencies.camera = () => new Promise(resolve => { release = resolve; });
  const camera = new ResearchCamera(fixture.video, () => assert.fail("Late frame"), () => {}, fixture.dependencies);
  const start = camera.start(); const disposal = camera.dispose(); release(fixture.stream);
  await Promise.all([start, disposal]); assert.ok(fixture.stats().stopped); assert.equal(fixture.stats().creates, 0);
});
