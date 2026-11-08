// Invented coordinates only. These tests never assert recognition accuracy.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, mkdir, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { sample, vocabulary, observation } from '../../../tests/helpers/research-fixture.mjs';
import { encodeBundle } from '../../../src/@modules/research/dataset.ts';
import { syntheticDataset, smoke } from '../smoke.ts';
import { preprocess, labelMap, normalizationState, augment } from '../preprocess.ts';
import { validateConfig, FEATURES } from '../config.ts';
import { loadRaw, readiness, validateSplit, newDirectory, hash } from '../data.ts';
import { prepare, readPrepared, claimTestEvaluation } from '../experiment.ts';
import { tensors } from '../model.ts';
import { classificationMetrics } from '../metrics.ts';
import { inferenceContract, validateContract } from '../contract.ts';
import { curves, evaluationFigures } from '../figures.ts';
const config = validateConfig(JSON.parse(await readFile(new URL('../config/baseline-v1.json', import.meta.url), 'utf8')));
const fixture = syntheticDataset();
const gate = () => readiness(fixture.values, fixture.vocabulary, config, true);
async function temporary(fn) { const dir = await mkdtemp(path.join(os.tmpdir(), 'day5-test-')); try { return await fn(dir); } finally { await rm(dir, { recursive: true, force: true }); } }
test('configuration rejects inconsistent features/policies and nonfinite settings', () => {
  assert.equal(FEATURES, 128);
  for (const change of [{ sequenceLength: 1 }, { learningRate: NaN }, { datasetNormalization: 'test-fitted' }, { splitRatios: [1,0,0] }]) assert.throws(() => validateConfig({ ...config, ...change }));
});
test('raw loader preserves source bytes and source checksums', () => temporary(async dir => {
  const file = path.join(dir,'sample.json'), content = JSON.stringify(sample()); await writeFile(file, content);
  const result = await loadRaw(dir); assert.equal(result.values.length,1); assert.equal(result.files[0].sha256,hash(content)); assert.equal(await readFile(file,'utf8'),content);
}));
test('raw loader rejects symlinks, malformed JSON and fixture paths', () => temporary(async dir => {
  const file = path.join(dir,'sample.json'); await writeFile(file,'{}'); await symlink(file,path.join(dir,'link.json')); await assert.rejects(loadRaw(dir),/symbolic/);
  await rm(path.join(dir,'link.json')); await writeFile(file,'{'); await assert.rejects(loadRaw(dir),SyntaxError);
  await mkdir(path.join(dir,'fixtures')); await writeFile(path.join(dir,'fixtures','one.json'),'{}'); await assert.rejects(loadRaw(path.join(dir,'fixtures')),/fixture/);
}));
test('real readiness rejects synthetic data, empty data and duplicate IDs', () => {
  assert.ok(readiness(fixture.values,fixture.vocabulary,config).reasons.some(x=>x.includes('Synthetic')));
  assert.equal(readiness([],fixture.vocabulary,config).ready,false);
  assert.equal(readiness([...fixture.values,fixture.values[0]],fixture.vocabulary,config,true).ready,false);
});
test('inactive, unreviewed and unknown labels are rejected without autoactivation', () => {
  for (const change of [{active:false},{reviewStatus:'provisional'}]) { const v=vocabulary(); Object.assign(v.labels[0],change); assert.throws(()=>preprocess(sample(),v,config)); }
  const s=sample();s.labelId='unknown';assert.throws(()=>preprocess(s,vocabulary(),config));
});
test('participant split is repeatable and keeps all sessions of each signer together', () => {
  const a=gate(), b=gate();assert.equal(a.ready,true); assert.deepEqual(a.split,b.split);
  const owners=new Map(); for(const [name,group] of Object.entries(a.split.splits)) for(const id of group.participants) { assert.equal(owners.has(id),false);owners.set(id,name); }
  for(const s of fixture.values) assert.ok(a.split.splits[owners.get(s.participantId)].sampleIds.includes(s.id));
  assert.equal(validateSplit(a.split,a.samples,fixture.vocabulary),a.split);
});
test('loaded split is authoritative and leakage/missing coverage is blocked', () => {
  const a=gate(), locked=structuredClone(a.split); [locked.splits.validation,locked.splits.test]=[locked.splits.test,locked.splits.validation];
  assert.deepEqual(readiness(fixture.values,fixture.vocabulary,config,true,locked).split,locked);
  const bad=structuredClone(locked);bad.splits.test.participants.push(bad.splits.train.participants[0]);assert.throws(()=>validateSplit(bad,a.samples,fixture.vocabulary));
  const missing=structuredClone(locked);missing.splits.test.sampleIds.pop();assert.throws(()=>validateSplit(missing,a.samples,fixture.vocabulary));
});
test('one-hand tensors are deterministic with stable labels and no raw mutation', () => {
  const s=sample(), before=structuredClone(s), a=preprocess(s,vocabulary(),config); assert.deepEqual(s,before);assert.deepEqual(a,preprocess(s,vocabulary(),config));
  assert.equal(a.values.length,32);assert.ok(a.values.every(r=>r.length===128&&r.every(Number.isFinite)));assert.equal(a.sampleId,s.id);
  assert.ok(a.values.every(r=>r[127]===0&&r.slice(63,126).every(v=>v===0)));assert.equal(a.values[0][126],1);
  assert.deepEqual(labelMap(vocabulary()).map(x=>[x.index,x.id,x.bangla]),[[0,'greeting','অভিবাদন'],[1,'thanks','ধন্যবাদ']]);
});
test('two hands share origin/scale and preserve relative position', () => {
  const s=sample();for(const f of s.frames) {f.right=observation('Left',0.4);f.validity.right=true;}
  const a=preprocess(s,vocabulary(),config), row=a.values[0];assert.equal(row[126],1);assert.equal(row[127],1);
  const expected=(s.frames[0].right.landmarks[0].x-s.frames[0].left.landmarks[0].x)/a.geometric.scale;
  assert.ok(Math.abs(row[63]-row[0]-expected)<1e-12);assert.ok(Math.abs(row[0]+row[63])<1e-12);
});
test('missing hand frames and unassigned detections are not imputed', () => {
  const s=sample();for(let i=10;i<15;i++){s.frames[i].unassigned=[s.frames[i].left];s.frames[i].left=null;s.frames[i].validity.left=false;}
  // Unassigned detections must have uncertain handedness in the raw schema.
  for(const f of s.frames) for(const hand of f.unassigned){hand.reportedHandedness=null;hand.handednessConfidence=null;}
  const a=preprocess(s,vocabulary(),config);assert.ok(a.values.slice(8,11).every(row=>row.every(x=>x===0)));
});
test('timestamp grid interpolates adjacent observations, not long gaps or extrapolation', () => {
  const s=sample(), a=preprocess(s,vocabulary(),config), t=4000/31;
  const expected=(0.2+0.0001+t/100*0.0002-a.geometric.origin[0])/a.geometric.scale;
  assert.ok(Math.abs(a.values[1][0]-expected)<1e-12);assert.ok(a.values.at(-1).every(x=>x===0));
  s.frames=s.frames.filter(f=>f.offsetMs<1000||f.offsetMs>1600);const b=preprocess(s,vocabulary(),config);assert.ok(b.values.slice(8,13).every(r=>r.every(x=>x===0)));
});
test('unsorted/duplicate timestamps, short and nonfinite samples fail', () => {
  for(const edit of [s=>{s.frames[2].offsetMs=s.frames[1].offsetMs;},s=>{s.frames.reverse();},s=>{s.frames=s.frames.slice(0,2);},s=>{s.frames[0].left.landmarks[0].x=NaN;},s=>{s.frames[0].left.landmarks[0].z=Infinity;}]) {const s=sample();edit(s);assert.throws(()=>preprocess(s,vocabulary(),config));}
});
test('degenerate scale and excessive missing target frames fail', () => {
  const s=sample();for(const f of s.frames)for(const p of f.left.landmarks)Object.assign(p,{x:0.2,y:0.3,z:0});assert.throws(()=>preprocess(s,vocabulary(),config),/scale/);
  assert.throws(()=>preprocess(sample(),vocabulary(),{...config,maxInterpolationGapMs:1}),/resampled/);
});
test('test coordinates cannot influence training normalization or training tensors', () => {
  const train=preprocess(sample(1),vocabulary(),config), state=normalizationState(), held=sample(2);
  held.frames.forEach(f=>f.left.landmarks.forEach(p=>p.x+=0.3));preprocess(held,vocabulary(),config);
  assert.deepEqual(normalizationState(),state);assert.deepEqual(state.fittedSampleIds,[]);assert.deepEqual(preprocess(sample(1),vocabulary(),config),train);
});
test('seeded augmentation is training-only, preserves masks and leaves raw/derived input intact', () => {
  const a=preprocess(sample(),vocabulary(),config), original=structuredClone(a), c={...config,augmentation:{enabled:true,coordinateJitter:0.005}};
  assert.deepEqual(augment(a,'train',c,4),augment(a,'train',c,4));assert.notDeepEqual(augment(a,'train',c,4),a);
  for(const split of ['validation','test'])assert.throws(()=>augment(a,split,c,4),/training-only/);
  assert.deepEqual(a,original);assert.deepEqual(augment(a,'test',config,4),a);
  assert.ok(augment(a,'train',c,4).values.every((row,i)=>row[126]===a.values[i][126]&&row[127]===a.values[i][127]&&row.slice(63,126).every(x=>x===0)));
});
test('tensors enforce [N,T,128] and one-hot class dimensions', () => {
  const a=preprocess(sample(),vocabulary(),config), out=tensors([a],config,2);
  try{assert.deepEqual(out.x.shape,[1,32,128]);assert.deepEqual(out.y.shape,[1,2]);}finally{out.x.dispose();out.y.dispose();}
  assert.throws(()=>tensors([{...a,values:[[1]]}],config,2));assert.throws(()=>tensors([{...a,label:2}],config,2));
});
test('metrics have expected confusion counts, zero-division and unsupported-class reporting', () => {
  const labels=[...labelMap(vocabulary()),{id:'absent',bangla:'অনুপস্থিত'}];
  const m=classificationMetrics([0,0,1],[[.9,.1,0],[.2,.8,0],[.1,.9,0]],labels);
  assert.deepEqual(m.confusion,[[1,1,0],[0,1,0],[0,0,0]]);assert.equal(m.accuracy,2/3);assert.deepEqual(m.unsupportedClasses,['absent']);assert.equal(m.perClass[2].f1,0);assert.ok(Math.abs(m.macro.f1-4/9)<1e-12);
  assert.throws(()=>classificationMetrics([0],[[NaN,0,0]],labels));
});
test('experiment directories never overwrite and snapshots detect tampering', () => temporary(async dir => {
  const a=gate(), target=path.join(dir,'experiment');await prepare(target,a.samples,fixture.vocabulary,a.split,config,'synthetic-lock','synthetic-smoke');
  await assert.rejects(newDirectory(target),/EEXIST/);await readPrepared(target);
  const file=path.join(target,'prepared.json'), data=JSON.parse(await readFile(file,'utf8'));data.groups.test[0].values[0][0]+=0.1;await writeFile(file,JSON.stringify(data));await assert.rejects(readPrepared(target),/changed/);
  await assert.rejects(prepare(path.join(dir,'not-real'),a.samples,fixture.vocabulary,a.split,config,'lock'),/Synthetic/);
}));
test('inference contract matches preprocessing/export dimensions and cannot deploy smoke models', () => {
  const c=inferenceContract(config,fixture.vocabulary,'synthetic-smoke',{vocabulary:hash(fixture.vocabulary),split:'synthetic'});validateContract(c);assert.equal(c.deployable,false);assert.equal(c.input.layout.leftPresent,126);
  for(const edit of [x=>{x.input.featuresPerFrame=126;},x=>{x.output.shape[1]=3;},x=>{x.labels[0].index=2;},x=>{x.deployable=true;},x=>{x.preprocessing.preprocessingVersion="unknown";},x=>{x.input.dtype="int32";},x=>{x.input.layout.leftPresent=0;}]){const bad=structuredClone(c);edit(bad);assert.throws(()=>validateContract(bad));}
});
test('figure writers preserve Bengali labels in temporary synthetic test artifacts', () => temporary(async dir => {
  const m=classificationMetrics([0,1],[[.8,.2],[.3,.7]],labelMap(vocabulary()));await evaluationFigures(dir,m,true);await curves(dir,[{epoch:1,loss:1,valLoss:1,accuracy:0,valAccuracy:0}],true);
  const {readdir}=await import('node:fs/promises');const files=await readdir(dir);assert.ok(files.some(f=>f.endsWith('.svg')));assert.ok(files.some(f=>f.endsWith('.csv')));
  assert.ok((await Promise.all(files.map(f=>readFile(path.join(dir,f),'utf8')))).some(text=>text.includes('অভিবাদন')));
}));
test('GRU and LSTM one-epoch training, selection, checkpoint roundtrip, evaluation/export guards and disposal', () => temporary(async dir => {
  const report=await smoke(dir,config);assert.equal(report.syntheticMetricsPublished,false);assert.equal(report.tensorsBefore,report.tensorsAfter);
  assert.deepEqual(report.observations.map(x=>x.parametersForTwoSyntheticClasses),[16018,21170]);assert.ok(report.observations.every(x=>x.forward==='passed'&&x.oneEpoch==='passed'&&x.checkpointRoundTrip==='passed'));
}));

test('validated Day-4 bundles load without changing raw content', () => temporary(async dir => {
  const source=encodeBundle(fixture.values,fixture.vocabulary), file=path.join(dir,'bundle.json');await writeFile(file,source);
  const result=await loadRaw(file);assert.equal(result.values.length,12);assert.equal(await readFile(file,'utf8'),source);
}));
test('all sessions of one signer remain in the same split', () => {
  const values=structuredClone(fixture.values);values.filter(s=>s.labelId==='thanks').forEach(s=>s.sessionId='S002');
  const a=readiness(values,fixture.vocabulary,config,true);assert.equal(a.ready,true);
  for(const participant of new Set(values.map(s=>s.participantId))) {
    const groups=Object.values(a.split.splits).filter(g=>g.sampleIds.some(id=>values.some(s=>s.id===id&&s.participantId===participant)));
    assert.equal(groups.length,1);assert.equal(values.filter(s=>s.participantId===participant&&groups[0].sampleIds.includes(s.id)).length,2);
  }
});
test('output writers reject a symbolic-link parent', () => temporary(async dir => {
  await mkdir(path.join(dir,'target'));await symlink(path.join(dir,'target'),path.join(dir,'link'));await assert.rejects(newDirectory(path.join(dir,'link','run')),/symbolic/);
}));

test('final evaluation claims cannot be reused across experiments or changed split locks', () => temporary(async dir => {
  const file=path.join(dir,'synthetic-lock.json'), split=gate().split;await writeFile(file,JSON.stringify(split));
  await assert.rejects(claimTestEvaluation(file,'wrong-hash','test-only','checkpoint'),/changed/);
  await claimTestEvaluation(file,hash(split),'synthetic-test-a','checkpoint');
  await assert.rejects(claimTestEvaluation(file,hash(split),'synthetic-test-b','checkpoint'),/EEXIST/);
}));
