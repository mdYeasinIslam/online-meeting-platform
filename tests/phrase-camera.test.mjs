import test from "node:test";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { trackingDiagnostics, PhraseCamera } from "../src/@modules/phrase-recognition/camera.ts";
function cameraFixture() {
  let creates = 0, gets = 0, active = 0, maxActive = 0, sends = 0, closed = 0, stopped = 0, listeners = 0;
  let resultCallback;
  const handlers = new Set();
  const track = { stop: () => { stopped++; }, addEventListener: (_, fn) => { handlers.add(fn); listeners = handlers.size; }, removeEventListener: (_, fn) => { handlers.delete(fn); listeners = handlers.size; } };
  const stream = { getTracks: () => [track] };
  const video = { srcObject: null, readyState: 2, play: async () => {}, pause: () => {} };
  const detector = { setOptions: options => { assert.deepEqual(options, {selfieMode:false,maxNumHands:2,modelComplexity:1,minDetectionConfidence:.7,minTrackingConfidence:.7}); }, onResults: callback => { resultCallback = callback; }, initialize: async () => {}, send: async () => { sends++; active++; maxActive = Math.max(maxActive, active); await delay(5); resultCallback({ multiHandLandmarks: [], multiHandedness: [] }); active--; }, close: async () => { closed++; } };
  const dependencies = { camera: async () => { gets++; return stream; }, detector: async () => { creates++; return detector; }, now: () => performance.now() };
  return { video, stream, dependencies, stats: () => ({ creates, gets, active, maxActive, sends, closed, stopped, listeners }) };
}
test("one detector/camera initialization and frame loop; dispose releases every resource", async () => {
  const fixture = cameraFixture(); let frames = 0;
  const camera = new PhraseCamera(fixture.video, () => { frames++; }, message => assert.fail(message), fixture.dependencies);
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
  const camera = new PhraseCamera(fixture.video, () => assert.fail("Late frame"), () => {}, fixture.dependencies);
  const start = camera.start(); const disposal = camera.dispose(); release(fixture.stream);
  await Promise.all([start, disposal]); assert.ok(fixture.stats().stopped); assert.equal(fixture.stats().creates, 0);
});


test("diagnostics separate raw detections from training-accepted hands and same-slot collisions", async () => {
 const { phraseFrame } = await import("../src/@modules/phrase-recognition/preprocess.ts");
 const points=Array.from({length:21},(_,i)=>({x:i/21,y:.5,z:0}));
 const raw={multiHandLandmarks:[points,points],multiHandedness:[{label:"Right",score:.95},{label:"Left",score:.79}]};
 const stats=trackingDiagnostics(raw,phraseFrame(raw,0),15);
 assert.equal(stats.rawHands,2);assert.equal(stats.acceptedHands,1);assert.equal(stats.fps,15);
 assert.deepEqual(stats.handedness.map(h=>h.accepted),[true,false]);
 raw.multiHandedness[1]={label:"Right",score:.99};
 assert.deepEqual(trackingDiagnostics(raw,phraseFrame(raw,0),15).handedness.map(h=>h.accepted),[false,true]);
 raw.multiHandedness[1]={label:"Left",score:.9};
 assert.equal(trackingDiagnostics(raw,phraseFrame(raw,0),15).acceptedHands,2);
});

test("local video uses the shared detector without webcam access, skips duplicate/paused frames and releases its source", async()=>{
 const fixture=cameraFixture();const events=new Map();let removed=0,loads=0,ended=0,frames=0; const mediaTimes=[];
 Object.assign(fixture.video,{currentTime:0,paused:false,seeking:false,src:"",addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name),removeAttribute:()=>{removed++;},load:()=>{loads++;}});
 fixture.dependencies.camera=async()=>assert.fail("Local video must not request camera access");
 const camera=new PhraseCamera(fixture.video,(_frame,_time,_stats,_raw,mediaTime)=>{frames++;mediaTimes.push(mediaTime);},assert.fail,fixture.dependencies,{url:"blob:test-only",ended:()=>{ended++;},playbackRate:.25});
 await camera.start();await delay(90);assert.equal(frames,1);
 await delay(90);assert.equal(frames,1,"same file frame must not be captured twice");
 fixture.video.currentTime=.1;await delay(90);assert.equal(frames,2);
 fixture.video.paused=true;fixture.video.currentTime=.2;await delay(90);assert.equal(frames,2);
 assert.deepEqual(mediaTimes,[0,100]);assert.equal(fixture.video.playbackRate,.25);
 events.get("ended")();assert.equal(ended,1);
 await camera.dispose();assert.equal(fixture.stats().gets,0);assert.equal(fixture.stats().closed,1);assert.equal(events.size,0);assert.equal(removed,1);assert.equal(loads,1);
});

test("shared overlay draws green xyz-independent points at source pixel positions and clears missing hands",async()=>{
 const { drawHandLandmarks }=await import("../src/@modules/research/hand-overlay.ts");
 const arcs=[],clears=[];const ctx={canvas:{width:1280,height:720},clearRect:(...args)=>clears.push(args),beginPath:()=>{},arc:(...args)=>arcs.push(args),fill:()=>{}};
 drawHandLandmarks({getContext:()=>ctx},[[{x:.25,y:.75},{x:NaN,y:0}]]);
 assert.equal(ctx.fillStyle,"#34d399");assert.deepEqual(arcs[0],[320,540,3,0,Math.PI*2]);assert.equal(arcs.length,1);
 drawHandLandmarks({getContext:()=>ctx},[]);assert.equal(clears.length,2);
});
