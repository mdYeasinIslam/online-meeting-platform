import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RecognizedDraft } from '../src/@modules/sign-recognition/recognized-draft.ts';
import { PredictionStabilizer } from '../src/@modules/sign-recognition/stabilizer.ts';
test('stable accepted tokens stay local until confirmed, then clear only after success',async()=>{
 const draft=new RecognizedDraft();const stabilizer=new PredictionStabilizer();const sent=[];
 for(let i=0;i<50;i++){
  const accepted=stabilizer.push({state:'prediction',text:'ক',confidence:0.99,timestamp:1000+i*100});
  if(accepted)draft.accept(accepted.text);
 }
 assert.deepEqual(draft.getSnapshot().tokens,['ক']);assert.equal(sent.length,0);
 await draft.send(async input=>sent.push(input));assert.equal(sent.length,1);assert.equal(sent[0].source,'sign');assert.equal(sent[0].text,'ক');assert.deepEqual(draft.getSnapshot().tokens,[]);
});
test('failed publication preserves draft and retry identity, including Bengali token edits',async()=>{
 const draft=new RecognizedDraft();draft.accept('ক্ষ');draft.accept('ক');draft.edit(false);assert.deepEqual(draft.getSnapshot().tokens,['ক্ষ']);
 let first;await draft.send(async input=>{first=input;throw Error('Transport unavailable');});
 assert.deepEqual(draft.getSnapshot().tokens,['ক্ষ']);assert.match(draft.getSnapshot().error,/unavailable/);
 let retry;await draft.send(async input=>{retry=input;});assert.equal(retry.id,first.id);assert.equal(retry.text,first.text);assert.equal(draft.getSnapshot().sent,true);
 draft.accept('অ');draft.edit(true);assert.deepEqual(draft.getSnapshot().tokens,[]);
});
test('pending publication locks edits/duplicate sends and retains newly accepted tokens',async()=>{
 const draft=new RecognizedDraft();draft.accept('ক');let release;let calls=0;
 const publish=()=>{calls++;return new Promise(resolve=>{release=resolve;});};
 const pending=draft.send(publish);await draft.send(publish);draft.edit(true);draft.edit(false);draft.accept('খ');
 assert.equal(calls,1);assert.deepEqual(draft.getSnapshot().tokens,['ক','খ']);assert.equal(draft.getSnapshot().sending,true);
 release();await pending;assert.deepEqual(draft.getSnapshot().tokens,['খ']);assert.equal(draft.getSnapshot().sending,false);
});
