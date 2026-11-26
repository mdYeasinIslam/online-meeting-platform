import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PHRASE_VOCABULARY as V, PHRASE_LABELS } from '../src/@modules/research/phrase-training/vocabulary.ts';
import { acceptPhraseReview, decodePhraseBundle, encodePhraseBundle, phraseExportBatches, phraseReceipt, reviewPhraseCapture, validatePhraseMetadata, validatePhraseQueue, validatePhraseSample } from '../src/@modules/research/phrase-training/dataset.ts';
import { PhraseTrainingRecorder } from '../src/@modules/research/phrase-training/recorder.ts';
import { phraseFrame, preprocessPhrase } from '../src/@modules/phrase-recognition/preprocess.ts';
import { temporalFrame } from '../src/@modules/research/frame.ts';
import { decodeBundle, encodeBundle } from '../src/@modules/research/dataset.ts';
import { sample, vocabulary } from './helpers/research-fixture.mjs';
import { phraseMetadata, trainingFrames, trainingSample } from './helpers/phrase-training-fixture.mjs';

test('fixed seven-class vocabulary is provisional; unknown is variable-hand negative data, not a fake reviewed phrase',()=>{
 assert.deepEqual(V.labels.map(label=>label.id),['hello','good_morning','good_night','how_are_you','i_am_fine','good_afternoon','unknown']);
 assert.deepEqual(V.labels.map(label=>label.index),[0,1,2,3,4,5,6]);
 assert.equal(V.reviewStatus,'provisional');assert.equal(V.labels[6].category,'negative-gesture');assert.equal(V.labels[6].handUsage,'variable');
 assert.equal(PHRASE_LABELS[5],'শুভ অপরাহ্ণ');
 for(const changes of [{pilotAcknowledged:false},{participantId:'name'},{sessionId:'someone'},{label:7},{requestedDurationMs:5000},{countdownMs:-1}])assert.throws(()=>validatePhraseMetadata({...phraseMetadata(),...changes}));
});
test('phrase collection reuses exact Python-fixture feature contract and raw handedness before research collision rejection',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/phrase-preprocessing.json',import.meta.url)));
 const frames=fixture.frames.map((frame,i)=>({...frame,timestamp:i*180}));
 const reviewed=reviewPhraseCapture(phraseMetadata(),trainingSample().id,'2026-01-01T00:00:01.000Z',2200,'manual',frames);
 assert.deepEqual(reviewed.errors,[]);assert.deepEqual(reviewed.sample.values,fixture.values);assert.ok(Array.isArray(reviewed.sample.values[0]));
 assert.deepEqual(reviewed.sample.values,preprocessPhrase(frames).map(row=>Array.from(row)));
 const points=frames[1].hands[0];const raw={multiHandLandmarks:[points,points],multiHandedness:[{label:'Right',score:.81},{label:'Right',score:.99}]};
 assert.equal(temporalFrame(raw,0).left,null);assert.ok(phraseFrame(raw,0).hands[0]);
 raw.multiHandedness[1]={label:'Left',score:.79};assert.equal(phraseFrame(raw,0).hands[1],null);
});
function clockFixture(){let now=0,timer=null,emits=0;const recorder=new PhraseTrainingRecorder(()=>{emits++;},{now:()=>now,date:()=>Date.parse('2026-01-01T00:00:01.000Z')+now,id:()=>trainingSample().id,schedule:fn=>{assert.equal(timer,null);timer=fn;return 1;},cancel:()=>{timer=null;}});return{recorder,setNow:t=>{now=t;},tick:t=>{now=t;const fn=timer;timer=null;assert.ok(fn);fn();},timer:()=>timer,emits:()=>emits};}
test('configurable 4/6/8 second takes, countdown and late timer clamps; review never implies acceptance',()=>{
 for(const duration of [4000,6000,8000])for(const countdown of [0,1000]){
  const f=clockFixture();f.recorder.start(phraseMetadata(0,duration,countdown),true);
  assert.equal(f.recorder.snapshot.phase,countdown?'countdown':'recording');
  if(countdown)f.tick(countdown);
  for(const frame of trainingFrames(duration))f.recorder.capture(frame,countdown+frame.timestamp);
  f.tick(countdown+duration+17);
  const state=f.recorder.snapshot;assert.equal(state.phase,'review');assert.deepEqual(state.review.errors,[]);
  assert.equal(state.review.sample.durationMs,duration);assert.equal(state.review.sample.countdownMs,countdown);assert.equal(state.review.sample.requestedDurationMs,duration);
  assert.equal('acceptedAt' in state.review.sample,false);assert.equal(f.timer(),null);
  const accepted=acceptPhraseReview(state.review,'2026-01-01T00:01:00.000Z');assert.equal(accepted.label,0);
  assert.equal(f.recorder.snapshot.phase,'review');f.recorder.cancel();assert.equal(f.recorder.snapshot.phase,'idle');f.recorder.dispose();
 }
});
test('manual finish, explicit discard/re-record, cancellation and disposal; invalid gates cannot start',()=>{
 const f=clockFixture();assert.throws(()=>f.recorder.start(phraseMetadata(),false));assert.throws(()=>f.recorder.start({...phraseMetadata(),pilotAcknowledged:false},true));
 f.recorder.start(phraseMetadata(1,6000,0),true);assert.throws(()=>f.recorder.start(phraseMetadata(),true));
 trainingFrames(2400).forEach(frame=>f.recorder.capture(frame,frame.timestamp));f.setNow(2500);f.recorder.stop();
 assert.equal(f.recorder.snapshot.review.sample.stoppedBy,'manual');assert.equal(f.recorder.snapshot.review.sample.durationMs,2500);
 f.recorder.cancel();assert.equal(f.recorder.snapshot.review,null);
 f.recorder.start(phraseMetadata(0,4000,1000),true);f.recorder.stop();assert.equal(f.recorder.snapshot.phase,'idle');assert.equal(f.timer(),null);
 f.recorder.start(phraseMetadata(),true);f.recorder.dispose();const emitted=f.emits();f.recorder.capture(trainingFrames()[0],2600);assert.equal(f.emits(),emitted);assert.equal(f.timer(),null);assert.throws(()=>f.recorder.start(phraseMetadata(),true));
});
test('deliberate unknown allows stationary one-hand/two-hand motion but never empty background recordings',()=>{
 const frames=trainingFrames();frames.forEach(frame=>{frame.hands=[trainingFrames()[0].hands[0],null];});
 const review=reviewPhraseCapture(phraseMetadata(6),trainingSample().id,'2026-01-01T00:00:01.000Z',4000,'manual',frames);
 assert.deepEqual(review.errors,[]);assert.equal(acceptPhraseReview(review,'2026-01-01T00:00:06.000Z').labelId,'unknown');
 const empty=frames.map(frame=>({...frame,hands:[null,null]}));const bad=reviewPhraseCapture(phraseMetadata(6),trainingSample().id,'2026-01-01T00:00:01.000Z',4000,'duration',empty);
 assert.ok(bad.errors.length);assert.throws(()=>acceptPhraseReview(bad));
});
test('versioned JSON roundtrip includes auditable raw frames and finite numeric [32,128] float32 arrays; old research contract remains independent',()=>{
 const original=trainingSample(),encoded=encodePhraseBundle([original]),json=JSON.parse(encoded);
 assert.equal(json.kind,'bdsl-phrase-training');assert.equal(json.preprocessingVersion,'phrase-frame-index-v1');assert.deepEqual(json.inputShape,[32,128]);assert.equal(json.labels[6],'অচেনা বা অসমর্থিত ইশারা');
 assert.equal(json.samples[0].values.length,32);assert.ok(json.samples[0].values.every(row=>Array.isArray(row)&&row.length===128&&row.every(Number.isFinite)));
 assert.deepEqual(decodePhraseBundle(encoded),JSON.parse(JSON.stringify([original])));assert.equal(original.detector.selfieMode,false);assert.equal(original.orientation.inputMirrored,false);
 const research=encodeBundle([sample()],vocabulary());assert.deepEqual(decodeBundle(research),[sample()]);assert.throws(()=>decodePhraseBundle(research));assert.throws(()=>decodeBundle(encoded));
});
test('import rejects inconsistent labels, versions, quality, consent, detector settings, masks, nonfinite values, shapes and raw/features mismatches',()=>{
 const mutations=[
  s=>{s.labelId='unknown';},s=>{s.label=7;},s=>{s.preprocessingVersion='other';},s=>{s.quality.validFrames=999;},s=>{s.consent.confirmed=false;},s=>{s.labelReview.status='reviewed';},s=>{s.detector.selfieMode=true;},s=>{s.values.pop();},s=>{s.values[0].pop();},s=>{s.values[0][126]=.5;},s=>{s.values[0][0]=NaN;},s=>{s.values[0][0]=Infinity;},s=>{s.values[0][0]=.123;},s=>{s.values[0][0]=Math.fround(.125);},s=>{s.frames[1].timestamp=0;},s=>{s.frames[0].hands[0][0].x=NaN;},s=>{s.acceptedAt=s.capturedAt;},s=>{s.frames[0].hands[0].pop();},s=>{s.orientation.inputMirrored=true;},s=>{s.values[0][63]=1;}
 ];
 for(const mutate of mutations){const altered=structuredClone(trainingSample());mutate(altered);assert.throws(()=>validatePhraseSample(altered));}
 const exported=JSON.parse(encodePhraseBundle([trainingSample()]));exported.labels[0]='changed';assert.throws(()=>decodePhraseBundle(JSON.stringify(exported)),/mapping/);
});
test('duplicate IDs and exact normalized motion are rejected within imports, across classes and saved batches',()=>{
 const a=trainingSample(),b=trainingSample(2);
 assert.throws(()=>validatePhraseQueue([a,{...b,id:a.id}]),/Duplicate sample ID/);
 assert.throws(()=>validatePhraseQueue([a,{...a,id:b.id,label:6,labelId:'unknown'}]),/Duplicate motion/);
 assert.throws(()=>validatePhraseQueue([{...a,id:b.id}],[phraseReceipt(a)]),/Duplicate motion/);
 assert.throws(()=>validatePhraseQueue([a],[phraseReceipt(a)]),/Duplicate sample ID/);
 const json=JSON.parse(encodePhraseBundle([a]));json.samples.push(a);assert.throws(()=>decodePhraseBundle(JSON.stringify(json)),/Duplicate/);
});
test('sample/byte limits retain pending review; safe batching roundtrips without silently deleting samples',()=>{
 const samples=[trainingSample(),trainingSample(2),trainingSample(3)];const initial=structuredClone(samples);
 assert.throws(()=>validatePhraseQueue(Array(101).fill(samples[0])),/Queue is full/);
 assert.throws(()=>encodePhraseBundle(samples,100),/byte limit/);
 const oneMax=Math.max(...samples.map(s=>new TextEncoder().encode(encodePhraseBundle([s])).byteLength))+1;
 const batches=phraseExportBatches(samples,oneMax,1);assert.equal(batches.length,3);
 assert.deepEqual(batches.flatMap(batch=>decodePhraseBundle(encodePhraseBundle(batch,oneMax))),JSON.parse(JSON.stringify(samples)));assert.deepEqual(samples,initial);
 assert.throws(()=>phraseExportBatches(samples,100),/size limit/);
});


test('published JSON Schema enumerates exactly the export and sample fields and fixed vocabulary contract',()=>{
 const schema=JSON.parse(readFileSync(new URL('../dataset/manifests/phrase-training.schema.v1.json',import.meta.url)));
 const encoded=JSON.parse(encodePhraseBundle([trainingSample()]));
 assert.deepEqual(Object.keys(encoded).sort(),schema.required.slice().sort());
 assert.deepEqual(Object.keys(encoded.samples[0]).sort(),schema.$defs.sample.required.slice().sort());
 assert.deepEqual(encoded.labels,schema.properties.labels.const);assert.deepEqual(encoded.labelIds,schema.properties.labelIds.const);
 assert.equal(schema.properties.preprocessingVersion.const,encoded.preprocessingVersion);
 assert.equal(schema.$defs.featureRow.prefixItems.length,128);
});
