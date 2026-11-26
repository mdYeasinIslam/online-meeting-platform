// Copy phrase-pilot into the frontend root; uses the existing project model builder.
import * as tf from '@tensorflow/tfjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {buildModel,saveModel} from '../research/temporal/model.ts';
const base=new URL('./',import.meta.url);
const read=async (name:string)=>JSON.parse(await readFile(new URL(name,base),'utf8'));
const data=await read('features.json'), manifest=await read('manifest.json');
const config=JSON.parse(await readFile(new URL('../research/temporal/config/baseline-v1.json',base),'utf8'));
if(data.length!==5||data.some((r:any,i:number)=>r.label!==i||r.values.length!==32||r.values.some((v:any)=>v.length!==128||v.some((n:any)=>!Number.isFinite(n)))))throw Error('Invalid features');
await tf.ready();
const x=tf.tensor3d(data.map((r:any)=>r.values));const y=tf.oneHot(tf.tensor1d(data.map((r:any)=>r.label),'int32'),5);
const model=buildModel('gru',5,config);
await model.fit(x,y,{epochs:150,batchSize:5,shuffle:true,callbacks:{onEpochEnd:(e,l)=>{if((e+1)%10===0)console.log(e+1,l)}}});
const dir=new URL('experimental-model/',base); await mkdir(dir,{recursive:true});await saveModel(model,decodeURIComponent(dir.pathname));
await writeFile(new URL('labels.json',dir),JSON.stringify(manifest.map((r:any,index:number)=>({index,id:r.id,bangla:r.bangla})),null,2));
const pred=model.predict(x) as tf.Tensor;console.log('Training clip predictions ONLY:',await pred.argMax(1).array());
await writeFile(new URL('LIMITATIONS.txt',dir),'Single signer, five source clips. Training fit only; no validation/test or live accuracy. Python MediaPipe differs from browser detector. Not production-ready.');
x.dispose();y.dispose();pred.dispose();model.dispose();
