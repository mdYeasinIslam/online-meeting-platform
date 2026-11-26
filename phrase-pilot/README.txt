Experimental five-phrase pilot for Let's Talk. Clips cut from the supplied tutorial; one signer and one clip per class, boundaries approximate. Verify labels, full motion, orientation and usage permission before training. No independent test data. No artificial signer IDs or consent metadata. Do not use the official readiness/evaluation CLI with this pilot.

Ubuntu / Python 3.12 / Node 22.16:
1. Extract phrase-pilot inside frontend project root (alongside package.json).
2. From frontend root: npm ci (only if dependencies not already installed).
3. python3 -m venv .venv-phrase
4. source .venv-phrase/bin/activate
5. pip install 'mediapipe==0.10.21' 'numpy<2' 'opencv-contrib-python==4.11.0.86'
6. python phrase-pilot/extract.py --permission-confirmed (only after permission confirmed)
7. node --experimental-strip-types phrase-pilot/train.mts
Output: phrase-pilot/experimental-model/model.json, weights.bin, labels.json.
Extraction follows the existing geometric normalization, left/right slots and presence masks, with uniform video frame times. It is not an exact browser runtime equivalence test. Training reuses existing buildModel/saveModel and changes epochs to 150 for training-fit experiment; no validation. Live integration is separate; never replace public/model (static alphabet).
Scripts not end-to-end executed in assistant environment because MediaPipe could not be installed and project npm dependencies not installed. For meaningful evaluation gather multiple independent signers and verify phrase definitions and permissions.
