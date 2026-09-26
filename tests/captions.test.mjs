import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ConnectionState, RoomEvent, DataPacket_Kind } from 'livekit-client';
import { CAPTION_CONFIG } from '../src/@modules/captions/config.ts';
import { encodeCaptionPacket, parseCaptionPacket, attributeCaption } from '../src/@modules/captions/protocol.ts';
import { LiveKitCaptionTransport } from '../src/@modules/captions/livekit-transport.ts';
import { appendCaption } from '../src/@modules/captions/feed.ts';
import { appendDraftToken, removeLastToken } from '../src/@modules/sign-recognition/draft.ts';
const now = 1700000000000;
const payload = (overrides = {}) => ({id:randomUUID(),participantId:'alice',participantName:'Alice',source:'sign',text:'কখ',timestamp:now,...overrides});
const packet = value => new TextEncoder().encode(JSON.stringify(value));
const wrap = value => ({version:1,type:'caption',payload:value});
test('versioned Unicode caption round-trip and authoritative sender namespacing', () => {
 const p = payload(); const wire=parseCaptionPacket(encodeCaptionPacket(p,now),now);
 assert.deepEqual(wire,wrap(p));
 assert.deepEqual(attributeCaption(wire,{identity:'bob',name:'Trusted Bob'}),{...p,id:`bob:${p.id}`,participantId:'bob',participantName:'Trusted Bob'});
 assert.equal(parseCaptionPacket(packet(wrap(payload({source:'speech'}))),now).payload.source,'speech');
});
test('reject malformed, unsupported, missing, oversized, invalid Unicode and stale wire data', () => {
 const invalid = [new Uint8Array(),new Uint8Array([0xff,0xfe]),new TextEncoder().encode('{'),new Uint8Array(CAPTION_CONFIG.maxPacketBytes+1),packet(null),packet([]),packet({...wrap(payload()),version:2}),packet({...wrap(payload()),type:'chat'}),packet({version:1,type:'caption'}),packet({...wrap(payload()),host:true})];
 for(const change of [{id:''},{id:'arbitrary'},{source:'admin'},{text:''},{text:'  '},{text:'ক'.repeat(501)},{text:'\ud800'},{text:'\u0000'},{timestamp:-1},{timestamp:1.5},{timestamp:now+60001},{timestamp:now-300001},{participantName:''},{participantId:''},{isHost:true}]) invalid.push(packet(wrap(payload(change))));
 const missing=payload();delete missing.text; invalid.push(packet(wrap(missing)));
 for(const bytes of invalid) assert.equal(parseCaptionPacket(bytes,now),null);
 assert.ok(parseCaptionPacket(packet(wrap(payload({text:'ক'.repeat(500)}))),now));
});
function fakeRoom() {
 const handlers=new Set(); const published=[];
 const sender={identity:'bob',name:'Trusted Bob'};
 const room={state:ConnectionState.Connected,remoteParticipants:new Map([['bob',sender]]),localParticipant:{identity:'alice',name:'Trusted Alice',async publishData(bytes,options){published.push({bytes,options});}},on(event,listener){assert.equal(event,RoomEvent.DataReceived);handlers.add(listener);return this;},off(event,listener){handlers.delete(listener);return this;}};
 return {room,sender,handlers,published,receive(bytes,who=sender,kind=DataPacket_Kind.RELIABLE,topic=CAPTION_CONFIG.topic){for(const fn of handlers)fn(bytes,who,kind,topic);}};
}
test('single subscription, spoof protection, duplicate rejection, local echo and cleanup',async()=>{
 const f=fakeRoom();const transport=new LiveKitCaptionTransport(f.room,()=>now);const feed=[];
 const unsubscribe=transport.subscribe(c=>feed.push(c));const unsubscribe2=transport.subscribe(()=>{});
 assert.equal(f.handlers.size,1);
 const p=payload();const bytes=encodeCaptionPacket(p,now);
 f.receive(bytes);f.receive(bytes);
 assert.equal(feed.length,1);assert.equal(feed[0].participantId,'bob');assert.equal(feed[0].participantName,'Trusted Bob');
 for(const callback of f.handlers) callback(bytes,undefined,DataPacket_Kind.RELIABLE,CAPTION_CONFIG.topic);f.receive(bytes,{identity:'mallory',name:'Alice'});f.receive(bytes,f.sender,DataPacket_Kind.LOSSY);f.receive(bytes,f.sender,DataPacket_Kind.RELIABLE,'other');
 assert.equal(feed.length,1);
 const local={id:p.id,source:'sign',text:'অ',timestamp:now};
 await transport.publish(local);await transport.publish(local);
 assert.equal(feed.length,2);assert.equal(f.published.length,1);assert.equal(feed[1].participantId,'alice');
 assert.equal(f.published[0].options.reliable,true);assert.equal(f.published[0].options.topic,CAPTION_CONFIG.topic);
 unsubscribe();assert.equal(f.handlers.size,1);unsubscribe2();assert.equal(f.handlers.size,0);
 transport.dispose();assert.equal(f.handlers.size,0);await assert.rejects(transport.publish(local),/Reconnect/);
});
test('publish failure has no local echo, preserves retry ID and disconnected sends fail',async()=>{
 const f=fakeRoom();const original=f.room.localParticipant.publishData;f.room.localParticipant.publishData=async()=>{throw Error('private internal failure');};
 const transport=new LiveKitCaptionTransport(f.room,()=>now);const feed=[];transport.subscribe(c=>feed.push(c));
 const input={id:randomUUID(),source:'sign',text:'ক',timestamp:now};
 await assert.rejects(transport.publish(input),/draft is saved/);assert.equal(feed.length,0);
 f.room.localParticipant.publishData=original;await transport.publish(input);assert.equal(feed.length,1);assert.equal(feed[0].id,`alice:${input.id}`);
 f.room.state=ConnectionState.Reconnecting;await assert.rejects(transport.publish({...input,id:randomUUID()}),/Reconnect/);transport.dispose();
});
test('per-sender flood limits, bounded histories and sender-scoped duplicate IDs',()=>{
 const f=fakeRoom();let clock=now;const transport=new LiveKitCaptionTransport(f.room,()=>clock);let feed=[];
 transport.subscribe(c=>{feed=appendCaption(feed,c,3);});
 for(let i=0;i<20;i++)f.receive(encodeCaptionPacket(payload({text:String(i)}),clock));
 assert.deepEqual(feed.map(c=>c.text),['2','3','4']);
 clock+=CAPTION_CONFIG.rateWindowMs;f.receive(encodeCaptionPacket(payload({text:'after cooldown',timestamp:clock}),clock));assert.equal(feed.at(-1).text,'after cooldown');
 transport.dispose();assert.equal(f.handlers.size,0);
});
test('recognized draft appends whole Unicode tokens and removes the last accepted token',()=>{
 const tokens=appendDraftToken(appendDraftToken([],'ক'),'ক্ষ');assert.equal(tokens.join(''),'কক্ষ');assert.deepEqual(removeLastToken(tokens),['ক']);
 assert.throws(()=>appendDraftToken(['ক'.repeat(500)],'খ'),/full/);assert.throws(()=>appendDraftToken([],''),/invalid/);
});
