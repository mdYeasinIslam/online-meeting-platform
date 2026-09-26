import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserSignSession } from '../src/@modules/sign-recognition/browser-session.ts';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('one inference loop, one load across pause/resume, cleanup never stops the owned camera',async()=>{
 const originalDocument=globalThis.document, originalMedia=globalThis.HTMLMediaElement;
 globalThis.document={createElement:()=>({readyState:2,async play(){},pause(){},remove(){},srcObject:null})};
 globalThis.HTMLMediaElement={HAVE_CURRENT_DATA:2};
 let loads=0,predictions=0,disposed=0,trackerLoads=0,closed=0,active=0,maxActive=0,attached=0,detached=0;
 let results;
 const engine={kind:'static-alphabet',async load(){loads++;},async predict(frame){predictions++;return {state:'prediction',text:'ক',confidence:0.99,timestamp:frame.timestamp};},dispose(){disposed++;}};
 const tracker={async initialize(){trackerLoads++;},setOptions(){},onResults(callback){results=callback;},async send(){active++;maxActive=Math.max(maxActive,active);await sleep(5);results({multiHandLandmarks:[],multiHandedness:[]});active--;},async close(){closed++;}};
 const track={isMuted:false,mediaStreamTrack:{readyState:'live'},attach(){attached++;},detach(){detached++;},stop(){assert.fail('Recognition must never stop LiveKit camera');}};
 const accepted=[];const session=new BrowserSignSession(()=>{},item=>accepted.push(item),engine,async()=>tracker);
 try {
  session.start(track);session.start(track);session.start(track);
  await sleep(1200);
  assert.equal(maxActive,1);assert.equal(loads,1);assert.equal(trackerLoads,1);assert.equal(accepted.length,1);
  session.stop();const count=predictions;await sleep(150);assert.equal(predictions,count);
  session.start(track);await sleep(150);assert.ok(predictions>count);assert.equal(loads,1);assert.equal(trackerLoads,1);
  await session.dispose();const final=predictions;await sleep(150);assert.equal(predictions,final);assert.equal(disposed,1);assert.equal(closed,1);assert.equal(attached,detached);
 } finally {await session.dispose();globalThis.document=originalDocument;globalThis.HTMLMediaElement=originalMedia;}
});
