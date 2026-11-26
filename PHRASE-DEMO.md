# Live Bangla phrase prototype

Run from `online-meeting-platform`:

```sh
npm run dev
```

Open http://localhost:3000/phrase-demo. No meeting, authentication, backend, or database setup is needed for this route. Camera access requires localhost or HTTPS, browser permission, and an available camera. MediaPipe's pinned browser assets are loaded from jsDelivr and require network access. TensorFlow.js model assets and labels load from the same origin.

The page loads the existing five-class GRU, opens an independent camera or a local video file, captures a complete phrase between Start Recording and Finish Recording, and runs actual inference. It supports repeated takes, reset, camera stop/restart, recording timer/count, detection status, configurable confidence (default 80%) and maximum duration (default 12 seconds, UI range 6–30). Reaching the duration/frame bound finishes the take automatically. Reset or stopping the camera discards an unfinished take. The camera and landmark data stay local; there is no recording upload or meeting publication.

## Files in this change

Created:

- `src/app/phrase-demo/page.tsx` — independent route.
- `src/@modules/phrase-recognition/preprocess.ts` — raw hand assignment, bounded timestamped buffer, exact feature layout, quality validation and resampling.
- `src/@modules/phrase-recognition/engine.ts` — label parsing, single-load model lifecycle, shape checks, real inference and tensor cleanup.
- `src/@modules/phrase-recognition/camera.ts` — phrase adapter over the shared research detector loop, plus raw/accepted hand diagnostics.
- `src/@modules/phrase-recognition/components/PhraseDemo.tsx` — controls, status, results and limitations.
- `tests/phrase.test.mjs` — preprocessing, labels, inference parity, rejection and model lifecycle tests.
- `tests/phrase-camera.test.mjs` — serialized detector loop, repeated initialization, disposal and pending-permission cancellation tests.
- `tests/fixtures/generate-phrase-fixture.py` — independent Python fixture generator using standard-library float32 packing (NumPy is not installed locally).
- `tests/fixtures/phrase-preprocessing.json` — synthetic raw landmarks and expected float32 features; contains no signer data.
- `e2e/phrase-demo.spec.ts` — actual Chromium model-load and reference-privacy smoke check.
- `playwright.phrase.config.ts` — isolated production-browser check on port 3015; `PHRASE_TEST_PORT` and `PLAYWRIGHT_CHROMIUM_EXECUTABLE` can override defaults.
- `PHRASE-DEMO.md` — this guide.

Moved `public/phrase-model/reference.json` to `phrase-pilot/reference.json`, outside publicly served assets. Modified `scripts/verify-phrase-model.mjs` to read that private location and use lint-compatible logging. Keep the private reference available locally for verification, but do not publish it. The application never imports it.

The model JSON, weights and labels are unchanged. Existing alphabet recognition, data collection, meetings, authentication and backend files were not edited. Other modifications already present in the working tree were preserved.

## Training preprocessing compatibility

The implementation follows `phrase-pilot/extract.py`, rather than the research temporal transformer:

1. Send unmirrored camera pixels to MediaPipe (`selfieMode: false`, two hands, complexity 1, detection/tracking confidence 0.7). Only the displayed preview is mirrored with CSS.
2. Reported `Right` goes into physical-left slot 0; reported `Left` into physical-right slot 1, matching the extraction script's unmirrored-source assumption. Retain the highest handedness score per slot at or above 0.8; ignore nonfinite/malformed landmarks. Unlike the research collector, collisions do not discard both observations.
3. Capture all processed frames, including missing-hand frames. Require at least eight valid frames and at least 60% hand coverage, matching extraction.
4. Use the mean of present wrists in the first valid frame as a fixed xyz origin. Use the maximum absolute coordinate displacement from that origin across the whole take as one shared scale. Reject scale below `1e-8`.
5. Sample 32 evenly spaced **frame indices**, inclusive of first/last, using floor/ceil linear interpolation. Do not interpolate a hand unless it exists at both bounding frames. The live capture checks their measured time gap against 250 ms; at constant FPS this equals Python's `(hi-lo)*1000/fps`. Timestamps do not otherwise change index-based resampling. This measured-gap check handles detector stalls; browser sampling cadence remains a possible domain difference from offline frame-by-frame extraction.
6. Each row contains 21 flattened xyz triples for left, then 21 for right, then left/right presence masks at indices 126/127. Missing slots stay zero. Calculate normalization/interpolation with JavaScript's double precision, then assign into `Float32Array`, matching the float32 training output.
7. Require at least eight valid resampled rows. Check finite `[32,128]` features and binary masks before constructing a float32 `[1,32,128]` input. Require `[1,5]` finite softmax output. Use the actual `labels.json` index mapping; English meanings are joined by Bangla text, not a separate assumed index order.

The synthetic Python fixture checks all feature values exactly, including ordering, missing hands and interpolation. Existing reference features check real model predictions against exported Python probabilities. Raw training detector results are not available, so a fresh end-to-end Python/browser detector parity comparison has not been performed. Browser MediaPipe and Python MediaPipe can produce different landmarks.

## Verification results

Executed on November 25, 2026:

- `node scripts/verify-phrase-model.mjs`: PASS, all five training samples classified correctly; maximum probability difference `5.960464477539063e-8`.
- `node --experimental-strip-types --test tests/phrase*.test.mjs`: PASS (eight individual checks across two files). Includes repeated real inference with stable tensor count and disposal returning to baseline; unmount during model loading; incompatible model and invalid-label rejection; camera-loop cleanup and permission cancellation.
- `npm run typecheck`: PASS.
- `npm run build`: PASS; `/phrase-demo` is present. The initial sandboxed build failed because Turbopack's CSS worker could not bind a local port. The permitted build outside that restriction succeeded.
- `npx playwright test --config playwright.phrase.config.ts`: PASS, one Chromium check against the production build. Actual GRU loads once; controls and all five labels render; private reference URL returns 404; no page exceptions. Screenshot saved locally at `/tmp/phrase-demo.png`. No webcam recognition was exercised.
- `npm run test:temporal`: PASS.
- Targeted ESLint on every changed/created JavaScript and TypeScript file: PASS.
- `npm test`: 11 of 13 test files pass. Unrelated failures remain in `foundation.test.mjs` (redirect expected `/dashboard`, received `/`) and `research-cli.test.mjs` (empty CLI stdout leads to `Unexpected end of JSON input`). Their source dependencies were not changed here.
- `npm run lint`: two existing `no-console` errors in `phrase-pilot/train.mts`, lines 13 and 16, plus an existing hook dependency warning in meeting `RoomIdSync.tsx`. These unrelated files were left unchanged.

The browser smoke uses production output: run `npm run build` before invoking its Playwright command. A server already running on port 3000 is left alone.

## Manual webcam checks

1. Wait for Model: Ready, click Start Camera, and grant permission. Check that the preview appears, movement is mirrored, and visible hands raise the detection count. Keep your upper body and both hands in frame with good lighting.
2. For **each** phrase below, click Start Recording immediately before signing, perform the whole phrase, and click Finish Recording immediately after it. Record the displayed Bangla, English, confidence, frame count and whether the result was uncertain. Do not count a high confidence score as proof that the phrase was correct.

| Phrase | English |
| --- | --- |
| হ্যালো | Hello |
| শুভ সকাল | Good Morning |
| শুভরাত্রি | Good Night |
| আপনি কেমন আছেন? | How are you? |
| আমি ভালো আছি | I am fine |

3. Repeat each phrase several times without reloading; try different signing speeds and another signer. Reset between takes if desired. Verify that camera stop/restart works and leaving the page releases its camera track.
4. Record with no hands or finish too quickly: expect rejection. Hide one hand during a two-handed phrase and observe the effect. Record an unsupported gesture and a stationary hand: check for false positives. The current threshold may still accept them.
5. Raise the threshold to 100% and check that lower-confidence results display “Uncertain — please try again”. Test maximum-duration auto-finish, reset while recording, stop while recording, permission denial, and camera unplug/disconnection.

## Limits and meeting integration

Only five isolated fixed phrases are supported. One original clip per class can establish training fit but cannot establish accuracy, signer generalization, or robust unknown-sign rejection. There is no automatic phrase segmentation or continuous translation. Live webcam recognition has not been validated in this implementation session.

Before meeting integration, collect independent multi-signer/multi-session validation and test clips (including unsupported gestures and idle hands), evaluate detection/capture domain differences, calibrate thresholds and report false positives and per-class confusion. Validate all five signs with fluent Bangla Sign Language users. Test the camera pipeline with real webcams and low-end devices.

After those checks, reuse the phrase engine and preprocessor behind an explicit opt-in mode. Adapt the camera layer to read the existing LiveKit video track without owning/stopping that track, as the static recognition session already does. Keep controlled recording initially. Add a user review/confirm step before publishing a predicted phrase to the existing caption flow. Automatic segmentation and continuous recognition need separate data, evaluation and implementation work.


## Shared hand-tracking update — November 26, 2026

Inspection of the actual working tree found these differences before this update:

| Behavior | Research collector | Phrase demo before update | Result of this update |
| --- | --- | --- | --- |
| MediaPipe version | Pinned 0.4.1675469240 | Same | Same shared factory |
| Camera | Unmirrored, ideal 640×480, front camera | Same | Shared constraints; intrinsic dimensions used for overlays |
| Detector | Two hands, complexity 1, detection/tracking 0.7 | Two hands, complexity 1, thresholds locally changed to 0.6 | Both use unchanged research config (0.7) |
| Scheduling | Serialized setTimeout loop, target 15 FPS | Duplicated loop, target 30 FPS | One shared serialized 15 FPS loop |
| Handedness | 0.8 threshold; duplicate slot assignments become unassigned | Threshold locally changed to 0.7; highest score per slot | Phrase restored to training's 0.8 and highest-score selection; research collision rules preserved |
| Display | Green points for accepted and unassigned hands, UI throttled at 250 ms | Only filtered count at 200 ms, no overlay | Shared green-point renderer, raw versus accepted counts, measured FPS and handedness scores |

The differing displays are a verified explanation for why visible “detection” could look better in research: its green overlay also shows hands that are not accepted for feature slots. A higher target FPS increases scheduling pressure but does not prove the cause of poor tracking. No controlled before/after webcam performance measurement was made. Lower thresholds are not a validated recognition fix; training-compatible filtering has been restored.

Additional implementation changes:

- New `src/@modules/research/hand-tracker.ts` owns the common detector factory, camera constraints, serial scheduling, cancellation and disposal. `ResearchCamera` is now a thin adapter that still calls the original `temporalFrame`; `PhraseCamera` calls `phraseFrame` directly on raw results. The research UI, consent, recorder and assignment behavior are preserved.
- New `src/@modules/research/hand-overlay.ts` contains the research collector's green-point drawing logic, now called by both pages. It clears using actual canvas dimensions. Phrase video and canvas share an intrinsic-aspect-ratio container and the same CSS mirror. Feature coordinates never use mirrored overlay pixels.
- Local video selection uses a browser object URL, with no file upload or public copy. Select **Local video file**, choose a trimmed unmirrored clip, click **Start Video**, then **Start Recording**. Recording rewinds the clip; end of file finishes the take. The detector warms up while playback is held so graph startup does not consume a short clip. Repeated timestamps, paused playback and seeking are skipped. Playback defaults to 0.25× (also selectable at 0.5× or 1×), and feature timestamps and the recording timer follow the source video timeline rather than wall-clock playback. Object URLs are revoked when replaced/unmounted; source listeners and decoder resources are released on stop.
- Diagnostics distinguish raw landmark detections from the hands accepted into model slots, display reported MediaPipe handedness (Right maps to physical-left on unmirrored input), and show the running average processed detector FPS. Low-score and collision-filtered hands remain visible as raw green points.
- `tests/phrase-camera.test.mjs` now also checks identical detector options, raw/accepted counts, collision diagnostics, file-source lifecycle/duplicate skipping and overlay pixel coordinates. `e2e/phrase-demo.spec.ts` includes an opt-in real-clip test (`PHRASE_VIDEO=1`) requiring local clips and MediaPipe CDN access.

The `[32,128]` feature transformer, normalization, slot ordering, masks, float32 conversion, index resampling and GRU engine remain unchanged apart from restoring the extractor's 0.8 handedness threshold. Trained weights, model topology and class mapping were not edited. Local-video playback is sampled at the shared detector cadence, using source media timestamps for gap validation. It does not extract every encoded frame like offline Python, so browser/Python detector parity is still not guaranteed.


### Verification of the shared-tracking update

- `node --experimental-strip-types --test tests/phrase*.test.mjs tests/research-lifecycle.test.mjs tests/research-data.test.mjs`: PASS, all four test files. The phrase files contain 11 individual tests, including the unchanged preprocessing fixture and repeated actual inference. Research recorder/camera and data validation regression tests pass.
- `node scripts/verify-phrase-model.mjs`: PASS, all five reference classes, maximum probability difference `5.960464477539063e-8`.
- `npm run test:temporal`: PASS.
- `npm run typecheck`: PASS.
- Targeted ESLint covering both adapters, the shared tracker/overlay, both UI files and changed tests: PASS.
- `npm run build`: PASS, with both `/phrase-demo` and `/research/data-collection` present. As before, the build needed local worker ports outside the execution sandbox.
- `PHRASE_VIDEO=1 npx playwright test --config playwright.phrase.config.ts`: PASS, two Chromium tests. The first verifies actual model loading and that private training references are not served. The second uploads the existing local `good_morning.mp4` to the browser file input, runs actual MediaPipe, captures landmarks, preprocesses the take and runs the actual GRU. At the default 0.25× playback it returned 41.7% confidence and correctly displayed **Uncertain**, below the 80% threshold. Screenshot: `/tmp/phrase-video-result.png`.

The initial full-speed real-video run measured approximately 1.8 processed FPS in headless Chromium. It detected hands, but only collected nine frames and correctly rejected the sequence for excessive resampling gaps. Slower file playback and source-time timestamps allow adequate capture without weakening the 250 ms safeguard. Webcam frames still use actual capture timestamps and will be rejected if the device cannot track fast enough. This observation concerns this headless runtime; it is not a measured before/after result for the user's webcam.

No physical webcam was available for accuracy testing. The real clip is a training-source clip, not independent validation data. Its uncertain result reinforces the remaining detector/domain and model-generalization limitations. Accurate phrase recognition still needs the separately planned retraining and independent evaluation. Runtime diagnostic logs also showed the existing root authentication provider attempting an unavailable Express backend; it did not prevent the demo's video tracking or inference.
