# Day-4.1 — evidence-based static alphabet diagnosis

**Outcome category D: diagnosis of the reported physical-sign failure remains incomplete because authoritative training code, label-map provenance and dataset evidence are missing.** The diagnostic task and independent safe corrections are implemented. This is not a claim that the user's signs now recognize correctly, nor that the model requires retraining based on synthetic accuracy.

## 1. Reported symptom

Most poses fail to recognize; `উ` appears disproportionately, including for poses believed to represent `আ`. The reference was an unverified Google image. No image, original training sample, physical-sign recording or labeled evaluation was available for this task. Do not infer that the user performed an incorrect sign.

## 2. Pipeline architecture

```text
LiveKit-owned camera → attached off-DOM video (no extra capture)
→ pinned MediaPipe Hands, up to two observations
→ one-hand continuity selection → validated 21 landmarks
→ wrist translation / max-absolute-coordinate normalization
→ interleaved 63 float32 values → batch [1,63]
→ stored TensorFlow.js MLP → validated 36 probabilities
→ explicit numeric label lookup → stabilizer
→ whole-token recognized draft → explicit Send caption
```

The standalone `/sign-demo` uses its own explicitly started camera, the same static engine/stabilizer and a CSS-mirrored canvas. Both views now offer the opt-in local diagnostic panel. This task does not change meeting lifecycle, caption transport, vocabulary, dataset schema or collection behavior.

## 3. Exact model assets

`public/model/model.json` (6,645 bytes), `public/model/group1-shard1of1.bin` (78,224 bytes), and `public/model/labels.json` (532 bytes). The manifest references exactly that shard. All 14 expected tensors are decoded and strictly assigned by name and shape; all 19,556 stored float32 values are finite. Existing tests compare every loaded tensor value with the saved shard. The Day-3 prefix-only `sequential/` name normalization remains necessary and correct; it was already implemented before this task.

The loader now additionally rejects duplicate normalized names, unexpected dtype/byte count, wrong tensor count, non-finite values and mismatched shapes. Failed assignment disposes both partial model and decoded tensors. The engine validates labels/shapes and disposes the model on label-load failure. Concurrent load calls share one promise; session stop/start retains one model and tracker, while unmount disposes them. Standalone camera stop tears down its separate lifecycle, so a subsequent standalone start legitimately reloads.

## 4. SHA-256 identification

| Asset | SHA-256 |
| --- | --- |
| model.json | `56469e16205f34b25f06e3872910423da4aa93017adab3cbff93f4764a7245bb` |
| labels.json | `1fc0d04c17b1173101465703818594ec6da0ffd92f5a58278752c894241c68db` |
| group1-shard1of1.bin | `133843f29e0b0315d6afd522530804ac9dd3938ffcc9d827a4185bd5d3d54098` |

Original weights, topology and labels were not modified. [Machine-readable probe evidence](DAY-4.1-PROBES.json) records hashes, shapes, all tensor statistics, every probe's top five and output-column statistics.

## 5. Architecture and version evidence

`63 → Dense(128, ReLU) → BatchNormalization → Dropout(0.3) → Dense(64, ReLU) → BatchNormalization → Dropout(0.2) → Dense(36, softmax)`.

Export metadata says Keras 3.13.2, backend tensorflow, TensorFlow.js Converter 4.22.0, Adam learning rate approximately 0.001 and sparse categorical cross-entropy. Runtime TensorFlow.js is 4.22.0. Metadata does not provide the original TensorFlow package version, training script, epochs, samples or metrics. Dropout is inactive during prediction. Architecture is not accuracy evidence.

## 6. Input/output contract

One rank-two float32 input `[null,63]` and one output `[null,36]`. Runtime prediction creates exactly `[1,63]` float32. Output decoding requires 36 finite values in [0,1], probability sum within 0.001 of 1, and a matching 36-label array. Ties choose the lowest output index deterministically. Top-five diagnostics use the same decoder as the raw winner.

## 7. Exact runtime label order

```text
 0 অ   1 আ   2 ই   3 ঈ   4 উ   5 ঊ   6 ঋ   7 এ   8 ঐ
 9 ও  10 ঔ  11 ক  12 খ  13 গ  14 ঘ  15 ঙ  16 চ  17 ছ
18 জ  19 ঝ  20 ঞ  21 ট  22 ঠ  23 ড  24 ঢ  25 ণ  26 ত
27 থ  28 দ  29 ধ  30 ন  31 প  32 ফ  33 ব  34 ভ  35 ম
```

Exactly 36 unique Bengali strings. `উ` is index **4**; `আ` is index **1**. Runtime mapping uses explicit numeric indices, not sorted labels, object-key iteration or filesystem order. Regression tests drive all 36 winner indices. No label was reordered or suppressed.

## 8. Label-order and training-evidence audit

Searched both repositories, ignored/untracked file paths outside dependency/build directories, documentation and all locally available Git-history paths for Python/notebooks, CSV/NumPy samples, saved models/encoders and conversion scripts. No authoritative training pipeline or authentic static samples were found. Client commit `3dfca0f` is titled “add BdSL36 model and data set inside public folder”, but its file changes contain the three model assets and a UI component, not a dataset. `68678fc` contains browser/model integration evidence, not training provenance. The current label hash matches the historical runtime asset. This does not establish the training encoder's order.

| Fact | Classification | Evidence/limit |
| --- | --- | --- |
| Runtime 36-label order and index 4 → উ | Verified from repository evidence | labels.json and every-index tests |
| Training index i equals runtime index i | Missing/unknown | Need saved encoder/class_indices tied to this model |
| Browser 21-landmark interleaved order/formula | Verified from repository evidence | normalization.ts, diagnostics.ts, tests |
| Training landmark/feature order and normalization | Missing/unknown | No training preprocessing or equivalent saved fixture |
| Training mirrored/left/right/both-hand policy | Missing/unknown | No dataset/training contract |
| Dataset identity and original sign references | Missing/unknown | “BdSL36” naming alone is insufficient |
| Class counts, signer identities and splits | Missing/unknown | No data/manifests from original static training |
| Held-out metrics/confusion matrix | Missing/unknown | Compiled metric name “accuracy” is not a result |
| Exact export procedure | Missing/unknown | Converter version is present; conversion command/script is absent |
| Keras/converter metadata and loaded weights | Verified from repository evidence | Export and exact tensor comparisons |
| Horizontal handedness mismatch may explain symptom | Inferred but not verified | Reflection probes are sensitive; physical/training policy missing |
| Original model is weak/imbalanced | Missing/unknown | Cannot infer from synthetic probes or architecture |

The earlier normalization comment “Must match Python logic exactly” was an assertion without a Python artifact, not evidence. It now explicitly says compatibility is unverified. The Day-3 documentation's “trained class labels” wording is corrected to “runtime class labels”; original research material remains available in [Day-3 research](DAY-3-RESEARCH.md) and [Day-4 delivery](DAY-4-DELIVERY.md).

## 9. Exact 63-feature order

MediaPipe indices remain 0–20. For each index i:

```text
feature[3*i + 0] = normalized x_i
feature[3*i + 1] = normalized y_i
feature[3*i + 2] = normalized z_i
```

Order is `[x0,y0,z0,x1,y1,z1,...,x20,y20,z20]`, not axis-grouped arrays. Exactly one selected hand contributes values; two hands are never concatenated. The frame result is cleared before each detector send so prior frame landmarks cannot substitute for a missing detector result.

## 10. Exact normalization and edge behavior

For landmark p_i=(x_i,y_i,z_i) and wrist p_0:

```text
c_i = p_i - p_0
s = max over i=0..20 and axis∈{x,y,z} of abs(c_i[axis])
f[3*i+axis] = c_i[axis] / s
```

Wrist is zero; valid output lies in [-1,1]. All axes share one scale, including z. This is translation plus maximum absolute coordinate scaling: no min-max mapping, palm-distance scaling, rotation, CSS transform, left/right conversion or automatic x reflection. Large finite z can dominate the shared scale; this behavior is preserved because training compatibility is unknown. Partly out-of-frame coordinates are not arbitrarily clamped.

The legacy normalization helper remains formula-compatible, including its zero-vector result on zero span. **The production feature gate now rejects** missing/incomplete/non-finite coordinates, overflow and span ≤1e-8 before model invocation. This is a numerical degeneracy bound, not a calibrated physical minimum hand size. Small nondegenerate hands remain allowed. Tests cover missing points, NaN/infinity, coincident/tiny geometry, large z, outside-frame values, exact feature indices and tensor shape.

## 11. Training normalization comparison

No line-by-line equivalence comparison is possible: training preprocessing is missing. The browser formula and dtype are verified internally only. No replacement normalization or coordinate reflection is claimed to be correct for the original training distribution.

## 12. Hand selection

Before: unconditionally classify detector array element zero, so reversing two-hand detection order changes the model input.

Now: use one complete finite hand; initialize from the first valid observation, then select the nearest previous wrist in image x/y coordinates. Array reversal does not switch hands. Clear continuity on no valid hands, stop, pause and dispose. A >0.25 normalized-image wrist jump or a known raw handedness change marks a continuity reset; the stabilizer starts a fresh window. Tests explicitly reverse detector order and verify selected index changes while selected geometry stays the same.

This is a conservative geometric heuristic, not biometric tracking. Crossing/occluded hands, unknown handedness or a fast replacement near the same wrist position can remain ambiguous. Use one visible hand for diagnosis. It cannot fix a training convention that is unknown.

## 13. Handedness

Both views retain raw MediaPipe Left/Right/unknown metadata and its confidence. Invalid/out-of-range confidence is shown as unavailable. Raw labels are **not claimed to be verified physical left/right**: the legacy MediaPipe convention assumes mirrored/selfie input, while this application sends untransformed video pixels. The metadata is exposed for diagnosis rather than used to mirror features. Training hand policy is unknown. See the primary [MediaPipe Hands documentation](https://chuoling.github.io/mediapipe/solutions/hands.html).

## 14. Mirroring

Standalone canvas: CSS `-scale-x-100`, so preview mirrored **yes**. The meeting's local VideoTrack has no application mirror transform, so preview mirrored **no**. Detector input is the underlying video element in both cases, not the CSS-rendered preview; the application performs no data-coordinate flip. Camera/driver-side processing itself is not established by CSS inspection. The diagnostic panel states the corresponding preview flag and “no application transform” for data coordinates.

No live mirroring toggle or automatic transformation was introduced. Reflected probe inputs are sensitivity tests, not approved production preprocessing.

## 15. Opt-in raw diagnostic behavior

Use “Show local recognition diagnostics” in a meeting or `/sign-demo`. It is hidden by default, local, and does not drive inference. It shows camera dimensions/readiness and timestamp, target/observed FPS, detector state/count, per-hand raw side/confidence/landmark count, selected index/continuity reset, preview/data mirroring, feature rejection or finite min/max/mean/scale/length, raw winner/index, top-five probabilities, probability sum/finite flag, threshold outcome, stabilizer window/stable status/reason, historical accepted label and measured model/pipeline duration.

No valid hand means no current raw label or top-five list. Feature rejection, low confidence, raw prediction, acceptance and duplicate suppression are distinct. Historical draft/accepted tokens remain visibly historical; no-hand does not erase previously composed text. Detector failures now have a distinct error state, and standalone failures clear stale current prediction diagnostics.

No camera frames, landmarks, identities or authentication data are stored/logged/exported by the diagnostics. The panel holds only bounded local summaries/top-five/window state. Updates are limited to the existing 500ms interval except phase changes/acceptances. Toggling it does not change thresholds, input, model output, stabilization or caption submission. The CLI writes only synthetic technical probes and model statistics.

## 16. Stabilizer and draft audit

Threshold **0.8**, window **8**, minimum matching observations **6**, majority **0.75**, cooldown **1200ms**, no-hand repeat-reset **500ms**. These values were not tuned. The full window must be present; majority must match the current raw prediction. Unknown/low confidence clears the window. No-hand clears it immediately, then clears duplicate-label suppression after 500ms. Stop/camera pause resets all pending state. RecognizedDraft accepts whole tokens; it contains no special case for `উ`.

New snapshot reasons distinguish reset, invalid prediction, no-hand, low confidence, warmup, unstable, accepted, duplicate suppression and cooldown. A selected-hand continuity change clears the pending stabilizer state. Tests show eight raw `উ` frames accept `উ`, switching to `আ` subsequently accepts `আ`, no-hand/restart clear pending state, and duplicate suppression does not turn another label into `উ`.

## 17. Deterministic technical probes

Reproduce from the client repository:

```bash
npm run diagnose:static -- docs/DAY-4.1-PROBES.json
```

Seed 410; original saved weights; actual TensorFlow.js CPU inference. 114 probes:

| Input family | Count | Raw winner distribution relevant to উ |
| --- | ---: | --- |
| Zero, small ramp, 64 deterministic random vectors | 66 | উ wins only zero and ramp (2); other inputs span many classes |
| Valid synthetic 21-landmark geometries | 24 | ণ index 25 wins 23; উ wins 1 |
| Same synthetic geometries reflected in x | 24 | উ index 4 wins 23; ণ wins 1 |

Zero input predicts `উ` at **0.7536556721**, below the unchanged 0.8 acceptance threshold; small ramp predicts `উ` at **0.7535477877**. No raw-vector or unreflected synthetic `উ` winner reaches 0.8. **20/24 reflected synthetic inputs** produce `উ` with confidence ≥0.8. Every probe's full top-five distribution is in the JSON artifact.

All 114 feature vectors differ. Among the 48 synthetic geometries/reflections, pairwise normalized-feature L2 distance is min **0.3935278866**, max **5.0579118441**, mean **2.3546336358**. Thus these probe features did not collapse to identical normalized vectors. This does not prove normalization matches real training.

Output-column 4 bias is **-0.0135501577**, not the largest positive bias (index 15 has approximately **0.0678876117**). Column 4 kernel min/max/mean/L2 are approximately **-0.394509 / 0.448511 / -0.017216 / 2.090219**. Its average output probability across these chosen probes is approximately **0.206698**. All column statistics are recorded. There is no evidence of a simple overwhelmingly positive `উ` output bias; nonlinear responses to these inputs are observations, not proof of training quality.

Tensor observation is recorded in the JSON: 200 additional inferences, 14 tensors after load and after the interval, zero after disposal. CPU latency varies by development load; the artifact records the actual measured mean. TensorFlow reports its CPU memory accounting as unreliable for total-byte estimates, so this is a tensor-count result, not a GPU/WASM memory or browser FPS claim.

## 18. Authentic labeled evaluation

**None: zero authentic labeled samples found.** Synthetic geometry is intentionally not labeled as any Bangla sign. No accuracy, confusion matrix, recall, signer generalization or physical-sign success rate is reported. Browser fake-camera no-hand output is technical behavior only.

## 19. Was উ dominance reproduced?

**Technically yes, for the reflected synthetic family; physically no.** The actual saved model emits index 4 before the stabilizer on those probes. The broader random-vector distribution does not support universal class collapse. A raw-model sensitivity can resemble the reported symptom, but does not identify why a particular physical `আ` pose produced `উ`.

## 20. Root cause and diagnosis category

**Category D**, as stated at the top. Missing training evidence prevents selecting among label-order mismatch, normalization mismatch, handedness/reference incompatibility or weak/imbalanced training. Independent implementation weaknesses were corrected but are not proven causes of the user's physical-sign failures.

| Candidate layer | Finding |
| --- | --- |
| Wrong/incompatible Google pose | Unknown; original reference and ground truth unavailable |
| MediaPipe detection | No-hand/error states exposed; real human-hand capture unverified |
| Hand selection | Order-instability risk demonstrated and corrected |
| Mirroring/handedness | Strong technical sensitivity; training expectation unknown |
| Landmark/feature order | Runtime interleaving verified; training equivalence unknown |
| Normalization | Runtime formula preserved; invalid geometry rejected; training formula missing |
| Input shape | Verified [1,63] float32 |
| Weight loading | All 14 stored tensors match; Day-3 fix remains intact |
| Label mapping | Every runtime index verified; training encoder missing |
| Class bias/collapse | No universal collapse in probes; no dominant positive index-4 output bias |
| Stabilizer/display | No special preference for উ; raw results precede stabilization; stale error display corrected |
| Original training data quality | Unknown; no class balance/split/metrics |

## 21. Safe fixes implemented

- Select one hand by geometric continuity rather than unstable first array position; reset pending stabilization on a detected hand change.
- Reject malformed/degenerate features before inference without changing the valid-input normalization formula.
- Strictly validate labels, probability vectors and model shapes/dtype; reject duplicate/missing/non-finite/incompatible weight data.
- Share concurrent model loading, clear selector state on stop/pause, separate detector errors and clear stale standalone prediction after errors.
- Expose bounded opt-in diagnostics and reproducible probes; cap standalone processing to the existing 10 FPS target.
- Correct unsupported documentation assertions about training equivalence/provenance.

No labels were reordered, no confidence threshold changed, no output suppressed or hard-coded, and no model asset was edited.

## 22. Unresolved unknowns

Need the training notebook/script, exact preprocessing function, saved label encoder with model association, original dataset source/license/reference poses, handedness/mirroring convention, signer/class distribution, split manifests, conversion command and held-out metrics. Exact camera-driver mirroring and the user's physical pose also need observation. Two-hand crossing identity is not guaranteed by nearest-wrist continuity. Actual valid-human-hand browser top-five results remain unobserved in this session.

## 23. Retraining decision and prerequisites

Retraining is **not yet proven required**. First recover the original inference contract and authentic labeled examples, then compare exact preprocessed vectors and evaluate the unchanged model. If the artifacts cannot be recovered, or verified real held-out evaluation demonstrates unacceptable performance, a future separately authorized reproducible replacement is reasonable.

Required prerequisites: verified BdSL alphabet/vocabulary references; qualified human review; original or new consented labeled data with provenance; versioned class-index map; exact shared/versioned preprocessing and handedness/mirroring policy; signer-independent train/validation/test split; class-balance report; reproducible training configuration/seeds/versions; real held-out evaluation; and a saved inference contract tied to model checksums. No training was performed in Day-4.1.

## 24. Exact physical manual test procedure

1. Use current desktop Chrome with camera permission, consistent lighting and a plain background. Use one full visible hand; keep wrist and fingertips in frame.
2. Open `/sign-demo` or join a test meeting with camera enabled. Enable “Show local recognition diagnostics”; start camera/recognition. In a meeting, verify audio/video continues.
3. Confirm camera dimensions/readiness, detected count, 21 selected landmarks, side/confidence and valid 63 features. Record the preview/data mirroring indicators; do not infer physical side solely from raw MediaPipe labels.
4. Use a neutral/rest pose first. Manually note timestamp, selected side, raw top five, winner, confidence and feature summary. It is not a labeled sign trial.
5. Remove the hand for at least one second and until the panel shows no-hand and an empty window (slow detector FPS can extend the wait). Verify raw output/top five clear and no new draft token is added.
6. Choose ONE label from a recovered original training reference or an authoritative, human-reviewed BdSL reference. Record reference provenance and expected label separately. If none exists, mark the trial unverified; do not score correctness.
7. Perform the pose and hold steadily until at least eight valid observations have filled the window. Record raw top five, threshold result, window, stable status and acceptance/suppression reason; distinguish raw from accepted output.
8. Keep holding: verify duplicate suppression rather than repeated characters. Remove the hand again until reset; repeat the same pose to verify repeat acceptance mechanics.
9. Repeat steps 5–8 for multiple verified labels, including আ and উ if their references are verified. Keep lighting/distance consistent; record failures and low-confidence outputs as observed.
10. Use the opposite hand only if recovered model provenance claims support. Do not change live mirroring as a purported fix. Document CSS-only preview behavior and any independently known camera-driver transformation.
11. Stop recognition, toggle camera off/on in a meeting, leave, and have a host end a separate test meeting. Verify current inference stops/pauses, no stale letter is emitted, and captions/media cleanup behaves as before.
12. Do not report accuracy from these few informal trials. A proper accuracy result requires a versioned, representative, held-out labeled evaluation.

No physical human-sign test was performed by this coding session. To persist research landmarks, use the existing consent-based Day-4 collection flow; the diagnostic panel adds no persistence.

## 25. Limits of the Google image

Search ranking is not proof of compatibility with this model. The image could represent another sign-language alphabet, a mirrored/opposite hand, a two-hand or dynamic sign, or a regional variant absent from training. Without an authoritative source or original training example, neither correctness nor incorrectness of the user's pose is established. No Google images were downloaded, copied or added to the repository.

## File inventory and commands

Created in client: `src/@modules/sign-recognition/diagnostics.ts`, `hand-selection.ts`, `components/RecognitionDiagnostics.tsx`; `scripts/static-diagnostics.mts`, `scripts/lib/static-probes.ts`; `tests/static-diagnostics.test.mjs`; `e2e/static-diagnostics.spec.ts`. Documentation: this report and `DAY-4.1-PROBES.json`.

Modified in client: recognition `static-engine.ts`, `model-loader.ts`, `normalization.ts` (comment only), `stabilizer.ts`, `browser-session.ts`, `types.ts`, `config.ts`, `components/SignCaptionComposer.tsx`, `components/StaticSignDemo.tsx`; `tests/recognition-lifecycle.test.mjs`; `package.json` (CLI script only). Existing documentation: `DAY-3-RESEARCH.md`. No server files or dependencies were changed.

```bash
# From online-meeting-platform
npm ls --depth=0
npm run typecheck
npm run lint
npm test
npm run diagnose:static -- docs/DAY-4.1-PROBES.json
npm run build
# Isolated browser suite, with ports 3000/5000 free and existing server LiveKit values:
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api npm run build
DAY2_LIVEKIT=1 DAY42_TESTING=1 npm run test:e2e
npm run build # restore normal .env.local build afterward

# From online-meeting-platform-server
npm run typecheck
npm run lint
npm test
npm run build
```

Application development startup remains `npm run dev` in each repository. The CLI contains no training command and does not read user cameras or credentials. Existing server/provider credentials are used only by the opt-in browser fixtures with temporary database/users, not by model probes.

## Verification record

Before editing: client dependency integrity, typecheck, lint, 94 tests and production build passed; server typecheck, lint, 16 tests and production build passed. Final client typecheck and lint pass; **102/102 unit tests pass**. Server typecheck/lint/build and **16/16 tests pass**, with no server changes. **21 distinct browser scenarios passed across verification runs**: seven existing foundation/media/caption scenarios, two diagnostic scenarios, five dashboard join scenarios, three research scenarios and four termination scenarios. The initial diagnostic component harness failed because Playwright rewrote JSX for its component-testing format; the harness was corrected to render the repository component through the actual React JSX runtime, then both diagnostic scenarios passed. Existing assertions were not weakened. A TypeScript DOM narrowing error in the new test was also corrected before final verification.

Both model-bearing builds passed TypeScript and compilation. The normal production build is restored after the local-API browser run. Model hashes match the pre-edit assets. Git whitespace checks pass. No environment/deployment files, caption protocol, dataset behavior, model files, or server source changed. No commits, pushes or deployments were performed.

The real meeting browser observation recorded a no-hand 1280×720 frame, 354.90ms full detector/pipeline latency and 2.51 observed FPS at that sampled point; these are single development observations with synthetic media, not model-only latency or sign accuracy. Research regression observed three synthetic no-hand takes at 3.3, 3.3 and 2.8 FPS, all correctly rejected as training samples. CPU probe timing below is separate from browser observation. Existing memory-server version and terminal color warnings were informational; all relevant checks passed. Browser diagnostics distinguish an actual detector run with synthetic no-hand video from a component-rendering test displaying saved real-model probe output; the latter is not a physical camera prediction.

Recommended next task: recover the original training preprocessing, encoder and authentic labeled reference samples, then perform a versioned preprocessing-equivalence and held-out evaluation audit before deciding whether a separately authorized retraining task is necessary. No Day-5 temporal work was started.

Recorded CPU probe interval: 0.767446 ms mean over 200 inferences; 14 tensors throughout loaded inference, zero after disposal. CPU byte accounting is marked unreliable by TensorFlow.js; no total-memory or GPU claim is made.
