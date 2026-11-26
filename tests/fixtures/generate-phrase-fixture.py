"""Synthetic fixture: independent stdlib equivalent of extract.py's NumPy math.
No signer data. Run python3 tests/fixtures/generate-phrase-fixture.py.
"""
import json, math, pathlib, struct
frames = []
for i in range(13):
    hands = []
    for k in range(2):
        hands.append(None if (k == 1 and i in (0, 4, 5, 12)) else [dict(x=.2 + .02*i + .007*p + .13*k, y=.3 - .003*i + .006*p, z=-.001*p + .002*k*i) for p in range(21)])
    frames.append(dict(timestamp=i*40, hands=hands))
first = next(f for f in frames if any(f['hands']))
origin = [sum(h[0][a] for h in first['hands'] if h)/sum(h is not None for h in first['hands']) for a in ('x','y','z')]
scale = max(abs(p[a]-origin[j]) for f in frames for h in f['hands'] if h for p in h for j,a in enumerate(('x','y','z')))
values = []
for j in range(32):
    t = (len(frames)-1)/31*j if j != 31 else len(frames)-1
    lo,hi = math.floor(t),math.ceil(t)
    w = t-lo
    row = [0.]*128
    for k in range(2):
        x,y = frames[lo]['hands'][k],frames[hi]['hands'][k]
        if x is not None and y is not None and (hi-lo)*40 <= 250:
            for p in range(21):
                for a,axis in enumerate(('x','y','z')):
                    v = ((1-w)*x[p][axis]+w*y[p][axis]-origin[a])/scale
                    row[k*63+p*3+a] = struct.unpack('f',struct.pack('f',v))[0]
            row[126+k] = 1.
    values.append(row)
pathlib.Path(__file__).with_name('phrase-preprocessing.json').write_text(json.dumps(dict(frames=frames,values=values),separators=(',',':'))+'\n')
