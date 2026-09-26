import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as tf from '@tensorflow/tfjs';
import { loadStaticLayersModel } from '../src/@modules/sign-recognition/model-loader.ts';
import { PredictionStabilizer, DEFAULT_STABILIZER_CONFIG } from '../src/@modules/sign-recognition/stabilizer.ts';
const modelJson=JSON.parse(fs.readFileSync(new URL('../public/model/model.json',import.meta.url)));
const raw=fs.readFileSync(new URL('../public/model/group1-shard1of1.bin',import.meta.url));
const bytes=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
const specs=modelJson.weightsManifest[0].weights;
test('all 14 trained tensors load exactly; repeated inference does not grow tensor count',async()=>{
 const before=tf.memory().numTensors;
 const model=await loadStaticLayersModel(tf.io.fromMemory({modelTopology:modelJson.modelTopology,weightSpecs:specs,weightData:bytes}));
 assert.deepEqual(model.inputs[0].shape,[null,63]);assert.deepEqual(model.outputs[0].shape,[null,36]);
 const decoded=tf.io.decodeWeights(bytes,specs);
 for(const weight of model.weights)assert.deepEqual(Array.from(weight.read().dataSync()),Array.from(decoded[`sequential/${weight.originalName}`].dataSync()));
 Object.values(decoded).forEach(t=>t.dispose());
 const loaded=tf.memory().numTensors;const start=performance.now();
 for(let i=0;i<200;i++){
  const output=tf.tidy(()=>Array.from(model.predict(tf.zeros([1,63])).dataSync()));
  assert.equal(output.length,36);assert.ok(output.every(Number.isFinite));
 }
 const average=(performance.now()-start)/200;
 assert.equal(tf.memory().numTensors,loaded);
 console.info(`Development CPU observation: 200 synthetic-vector inferences, ${average.toFixed(2)} ms mean; tensor count stable at ${loaded}. Not recognition accuracy or browser FPS.`);
 model.dispose();assert.equal(tf.memory().numTensors,before);
});
test('strict model load rejects missing stored weights rather than accepting random initialization',async()=>{
 const before=tf.memory().numTensors;
 await assert.rejects(loadStaticLayersModel(tf.io.fromMemory({modelTopology:modelJson.modelTopology,weightSpecs:[],weightData:new ArrayBuffer(0)})));
 const corrupt=specs.map((w,i)=>i===0?{...w,name:'wrong/name'}:w);
 await assert.rejects(loadStaticLayersModel(tf.io.fromMemory({modelTopology:modelJson.modelTopology,weightSpecs:corrupt,weightData:bytes})));
 assert.equal(tf.memory().numTensors,before);
});
test('minimum observations and majority are explicit; reset clears duplicate suppression',()=>{
 assert.equal(DEFAULT_STABILIZER_CONFIG.minStableObservations,6);
 const s=new PredictionStabilizer({windowSize:4,majorityRatio:0.75,minStableObservations:4,cooldownMs:0});
 const predict=(text,timestamp,confidence=0.95)=>({state:'prediction',text,confidence,timestamp});
 for(const [i,text] of ['ক','খ','ক','ক'].entries())assert.equal(s.push(predict(text,i)),null);
 assert.equal(s.push(predict('ক',4)),null);assert.equal(s.push(predict('ক',5)).text,'ক');
 for(let i=6;i<20;i++)assert.equal(s.push(predict('ক',i)),null);
 s.reset();for(let i=0;i<3;i++)assert.equal(s.push(predict('ক',i)),null);assert.equal(s.push(predict('ক',4)).text,'ক');
 assert.throws(()=>new PredictionStabilizer({windowSize:2,minStableObservations:3}));
});
