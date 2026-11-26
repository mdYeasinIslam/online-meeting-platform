// SYNTHETIC TEST DATA ONLY: generated motion is not a real BdSL sign.
import { reviewPhraseCapture, acceptPhraseReview } from '../../src/@modules/research/phrase-training/dataset.ts';
export function phraseMetadata(label=0, duration=4000, countdown=0) {
 return {participantId:'P001',sessionId:'S001',label,consentAt:'2026-01-01T00:00:00.000Z',pilotAcknowledged:true,width:640,height:480,requestedDurationMs:duration,countdownMs:countdown};
}
export function trainingFrames(duration=4000, variation=1) {
 return Array.from({length:Math.floor(duration/80)},(_,i)=>({timestamp:i*80,hands:[Array.from({length:21},(_,p)=>({x:.2+p*.008+Math.sin(i*.12)*.03,y:.3+p*.005+Math.cos(i*.09+variation*.08)*.02,z:-p*.001+Math.sin(i*.07*variation)*.015})),i%9===0?null:Array.from({length:21},(_,p)=>({x:.6+p*.005+Math.cos(i*.08)*.04,y:.3+p*.004+Math.sin(i*.13)*.03,z:-p*.002}))]}));
}
export function trainingSample(index=1,label=0) {
 const review=reviewPhraseCapture(phraseMetadata(label),`10000000-0000-4000-8000-${index.toString(16).padStart(12,'0')}`,'2026-01-01T00:00:01.000Z',4000,'duration',trainingFrames(4000,index));
 return acceptPhraseReview(review,'2026-01-01T00:00:06.000Z');
}
