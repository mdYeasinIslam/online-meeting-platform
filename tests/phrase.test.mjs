import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import * as tf from '@tensorflow/tfjs';
import { PhraseEngine, parsePhraseLabels } from '../src/@modules/phrase-recognition/engine.ts';
import { phraseFrame, preprocessPhrase, PhraseBuffer } from '../src/@modules/phrase-recognition/preprocess.ts';
const json = name => JSON.parse(readFileSync(new URL(name, import.meta.url)));
const fixture = json('./fixtures/phrase-preprocessing.json');
const labels = json('../public/phrase-model/labels.json');
const reference = json('../phrase-pilot/reference.json');
const topology = json('../public/phrase-model/model.json');
const bytes = readFileSync(new URL('../public/phrase-model/weights.bin', import.meta.url));
const loadModel = () => tf.loadLayersModel(tf.io.fromMemory({modelTopology:topology.modelTopology,weightSpecs:topology.weightsManifest[0].weights,weightData:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}));

test('preprocessing exactly matches independent Python fixture, xyz ordering, float32, missing hands and frame-index sampling', () => {
 const actual=preprocessPhrase(fixture.frames);
 assert.ok(actual.every(row=>row instanceof Float32Array));
 assert.deepEqual(actual.map(row=>Array.from(row)),fixture.values);
 assert.equal(actual[0][0],0); assert.equal(actual[0][1],0); assert.equal(actual[0][2],0);
 assert.equal(actual[0][126],1); assert.equal(actual[0][127],0);
 assert.ok(Array.from(actual[0].slice(63,126)).every(v=>v===0));
 const irregular=structuredClone(fixture.frames); irregular.forEach((f,i)=>f.timestamp=i*i);
 assert.deepEqual(preprocessPhrase(irregular),actual,'index sampling must not become elapsed-time sampling');
 const gap=structuredClone(fixture.frames); gap.forEach((f,i)=>f.timestamp=i*300);
 assert.throws(()=>preprocessPhrase(gap),/resampled/);
});
test('unmirrored handedness, highest score collision, threshold, finite coordinates and copied data', () => {
 const points=fixture.frames[1].hands[0]; const other=fixture.frames[2].hands[0];
 const frame=phraseFrame({multiHandLandmarks:[points,other,points],multiHandedness:[{label:'Right',score:.8},{label:'Right',score:.9},{label:'Left',score:.79}]},40);
 assert.deepEqual(frame.hands,[other,null]); other[0].x+=1; assert.notEqual(frame.hands[0][0].x,other[0].x); other[0].x-=1;
 assert.deepEqual(phraseFrame({multiHandLandmarks:[points],multiHandedness:[{label:'Left',score:.8}]},0).hands,[null,points]);
 const invalid=structuredClone(points); invalid[0].x=NaN;
 assert.deepEqual(phraseFrame({multiHandLandmarks:[invalid],multiHandedness:[{label:'Right',score:.9}]},0).hands,[null,null]);
});
test('rejects empty, inadequate, malformed, unordered, nonfinite and degenerate sequences; bounded buffering',()=>{
 assert.throws(()=>preprocessPhrase([]));
 const empty=fixture.frames.map(f=>({...f,hands:[null,null]})); assert.throws(()=>preprocessPhrase(empty),/Insufficient/);
 const weak=structuredClone(fixture.frames); weak.slice(0,7).forEach(f=>f.hands=[null,null]); assert.throws(()=>preprocessPhrase(weak),/Insufficient/);
 const invalid=structuredClone(fixture.frames); invalid[0].hands[0][0].x=Infinity; assert.throws(()=>preprocessPhrase(invalid),/Invalid/);
 const short=structuredClone(fixture.frames); short[0].hands[0].pop(); assert.throws(()=>preprocessPhrase(short),/Invalid/);
 const duplicate=structuredClone(fixture.frames); duplicate[1].timestamp=0; assert.throws(()=>preprocessPhrase(duplicate),/timestamps/);
 const flat=fixture.frames.map(f=>({...f,hands:[Array.from({length:21},()=>({x:0,y:0,z:0})),null]})); assert.throws(()=>preprocessPhrase(flat),/Degenerate/);
 const buffer=new PhraseBuffer(0,100); assert.ok(buffer.push(fixture.frames[0])); assert.equal(buffer.push(fixture.frames[0]),false); assert.equal(buffer.push(fixture.frames[3]),false);
});
test('label indices come from labels.json even after remapping; English is joined by phrase',()=>{
 assert.equal(parsePhraseLabels(labels)[3].english,'How are you?');
 const swapped={...labels,0:labels[4],4:labels[0]}; assert.equal(parsePhraseLabels(swapped)[0].english,'I am fine');
 for(const invalid of [[],null,{}, {...labels,4:labels[0]}, {...labels,5:'extra'}]) assert.throws(()=>parsePhraseLabels(invalid));
 assert.equal(existsSync(new URL('../public/phrase-model/reference.json',import.meta.url)),false);
});
test('actual GRU loading once, shapes, reference prediction parity, uncertain result and repeated tensor cleanup',async()=>{
 const baseline=tf.memory().numTensors; let loads=0;
 const engine=new PhraseEngine({model:async()=>{loads++;const m=await loadModel();assert.deepEqual(m.inputs[0].shape,[null,32,128]);assert.deepEqual(m.outputs[0].shape,[null,5]);return m;},labels:async()=>labels});
 await Promise.all([engine.load(),engine.load()]); assert.equal(loads,1);
 const loaded=tf.memory().numTensors;
 for(let repeat=0;repeat<3;repeat++) for(let i=0;i<5;i++) {
  const prediction=engine.predict(reference.X[i]); const expected=reference.predictions[i];
  assert.equal(prediction.label.index,i); assert.ok(Math.abs(prediction.confidence-Math.max(...expected))<.0001);
  assert.equal(tf.memory().numTensors,loaded);
 }
 assert.equal(engine.predict(reference.X[0],1).accepted,false);
 for(const bad of [[],reference.X[0].slice(1),Array.from({length:32},()=>Array(128).fill(0)),reference.X[0].map(row=>row.map(()=>NaN))]) assert.throws(()=>engine.predict(bad));
 assert.throws(()=>engine.predict(reference.X[0],NaN)); assert.equal(tf.memory().numTensors,loaded);
 engine.dispose();engine.dispose();assert.equal(tf.memory().numTensors,baseline);assert.throws(()=>engine.predict(reference.X[0]));await assert.rejects(engine.load());
});
test('dispose during model loading and incompatible-model errors free tensors; label errors skip model fetch',async()=>{
 const baseline=tf.memory().numTensors;let release; const pending=new Promise(r=>release=r);let entered;
 const started=new Promise(r=>entered=r);
 const engine=new PhraseEngine({labels:async()=>labels,model:async()=>{entered();await pending;return loadModel();}});
 const loading=engine.load();await started;engine.dispose();release();await assert.rejects(loading,/closed/);assert.equal(tf.memory().numTensors,baseline);
 const bad=new PhraseEngine({labels:async()=>labels,model:async()=>tf.sequential({layers:[tf.layers.dense({inputShape:[2],units:5})]})});
 await assert.rejects(bad.load(),/Incompatible/);bad.dispose();assert.equal(tf.memory().numTensors,baseline);
 const badLabels=new PhraseEngine({labels:async()=>({}),model:async()=>assert.fail('model must not load')}); await assert.rejects(badLabels.load());badLabels.dispose();
});
