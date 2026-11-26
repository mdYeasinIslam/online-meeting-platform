"""Experimental source-video extraction; no consent or expert review is fabricated."""
import argparse,json,pathlib
import cv2,mediapipe as mp,numpy as np
p=pathlib.Path(__file__).resolve().parent
ap=argparse.ArgumentParser();ap.add_argument('--permission-confirmed',action='store_true');a=ap.parse_args()
if not a.permission_confirmed: ap.error('Confirm that you have permission to use the video for training.')
rows=json.loads((p/'manifest.json').read_text()); out=[]
for i,r in enumerate(rows):
 cap=cv2.VideoCapture(str(p/r['clip'])); fps=cap.get(cv2.CAP_PROP_FPS); frames=[]
 if fps<=0: raise RuntimeError('Cannot read '+r['clip'])
 with mp.solutions.hands.Hands(max_num_hands=2,model_complexity=1,min_detection_confidence=.7,min_tracking_confidence=.7) as hands:
  while True:
   ok,bgr=cap.read()
   if not ok: break
   res=hands.process(cv2.cvtColor(bgr,cv2.COLOR_BGR2RGB)); slots=[None,None]; scores=[0,0]
   for lm,hand in zip(res.multi_hand_landmarks or [],res.multi_handedness or []):
    c=hand.classification[0]; slot=0 if c.label=='Right' else 1 # unmirrored source assumption
    if c.score>=.8 and c.score>scores[slot]:
     pts=np.array([[x.x,x.y,x.z] for x in lm.landmark]);
     if np.isfinite(pts).all(): slots[slot]=pts; scores[slot]=c.score
   frames.append(slots)
 cap.release()
 if len(frames)<2: raise RuntimeError('Too few frames')
 valid=sum(any(x is not None for x in f) for f in frames)
 if valid<8 or valid/len(frames)<.6: raise RuntimeError(f'{r["id"]}: inadequate detection {valid}/{len(frames)}')
 first=next(f for f in frames if any(x is not None for x in f)); origin=np.mean([x[0] for x in first if x is not None],axis=0)
 scale=max(np.abs(x-origin).max() for f in frames for x in f if x is not None)
 if scale<1e-8: raise RuntimeError('Degenerate landmarks')
 values=np.zeros((32,128),dtype=np.float32)
 for j,t in enumerate(np.linspace(0,len(frames)-1,32)):
  lo=int(np.floor(t)); hi=int(np.ceil(t)); w=t-lo
  for k in range(2):
   x,y=frames[lo][k],frames[hi][k]
   if x is not None and y is not None and (hi-lo)*1000/fps<=250:
    values[j,k*63:(k+1)*63]=(((1-w)*x+w*y-origin)/scale).reshape(-1);values[j,126+k]=1
 if np.count_nonzero(values[:,126:].any(axis=1))<8: raise RuntimeError('Too few resampled frames')
 out.append(dict(id=r['id'],label=i,participantId='source-01',values=values.tolist(),detectedFrames=valid,totalFrames=len(frames)))
 print(r['id'],valid,'/',len(frames),'frames')
(p/'features.json').write_text(json.dumps(out,ensure_ascii=False)); print('Saved features.json: [5,32,128]')
