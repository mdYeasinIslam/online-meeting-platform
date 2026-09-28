# Day-5 temporal research pipeline

The implementation is ready for reviewed data. Real training is currently blocked: the inspected corpus has zero real samples, participants and sessions, and all 12 vocabulary candidates are inactive/provisional. See [readiness evidence](reports/readiness-day5.json), [the 50-item delivery report](../../docs/DAY-5-REPORT.md), and [the machine-readable contract](inference-contract.v1.json). The empty output label list in that contract is intentional: `status: blocked`, `deployable: false`.

## Environment and scope

Run commands from `online-meeting-platform`. Training uses the repository's existing **Node 22.16.0 + TensorFlow.js 4.22.0 CPU** environment. `.node-version` and the research package's engine field record the Node version; the root `package-lock.json` pins the installed dependency graph. `environment` verifies TensorFlow.js and records the actual Node version, backend, lockfile checksum and Git commit. Use the exact recorded Node version for reproduction.

```bash
nvm install 22.16.0
nvm use 22.16.0
npm ci
npm run temporal -- environment
npm run test:temporal
npm run temporal -- smoke
```

`nvm` is optional; an existing Node 22.16.0 installation is sufficient. No Python, GPU or native TensorFlow dependency was added. TypeScript modules reuse the existing schema, validator and participant splitter, avoiding a second preprocessing implementation. Research modules are outside `src` and are not imported into the production client. The authoritative checkpoint is a **native TensorFlow.js LayersModel**, not Keras; consequently no Keras-to-JS conversion is necessary. This is the chosen non-Python environment variant. Numerical comparison is Node TF.js CPU versus Chromium TF.js CPU.

Colab is optional and unverified: run the same Node version and reusable CLI modules in a CPU runtime if desired; this task does not create a notebook, upload datasets or use a GPU. Keep private recordings local unless a separate consent/data-handling decision permits cloud use.

No meeting integration, segmentation, speech recognition, translation, deployment, LiveKit, caption protocol, static model, authentication or server changes are part of this delivery.

## Readiness and immutable inputs

```bash
npm run dataset -- vocabulary
npm run dataset -- validate --input dataset/raw --seed day5-v1
npm run dataset -- stats --input dataset/raw --seed day5-v1
npm run temporal -- readiness
```

Readiness exit codes: `0` ready, `2` expected data block, `1` malformed input/configuration or execution failure. The Day-4 validator accepts an empty structurally valid dataset; the Day-5 readiness gate correctly blocks training on it. `npm run dataset -- split --seed day5-v1` currently fails because fewer than three signers exist.

The gate requires at least two active human-reviewed labels, valid pseudonymous participant/session IDs, unique sample IDs, accepted quality, sufficient signers, and every active label in every split. It reports quality/identical-motion warnings and blocks until they are resolved; it never activates or drops labels. Day-4 checks include duration/frame/FPS/missing-hand thresholds, detector/orientation/consent metadata and coordinate bounds. At least three signers is a technical minimum, not an adequate study-size recommendation. Below ten participants the splitter warns; very small test groups cannot support strong generalization claims. Collect substantially more signers, or separately design leave-one-signer-out/group k-fold evaluation. No sample-random split is offered.

Raw single-sample JSON and Day-4 exported bundles are accepted via `--input`. A directory is visited in deterministic name order. File-size/count/depth limits, symlink checks, synthetic-directory rejection and synthetic provenance markers protect the boundary. Provenance markers cannot independently prove a human recording's authenticity; collection and human review remain necessary. Synthetic fixtures live only in automated test helpers and ignored technical smoke directories. Do not copy them into the real corpus or strip their markers.

Raw files are never written. Derived sequences retain sample, participant and session IDs, label index, shared origin/scale and `[T,128]` values. Each experiment saves source paths/file SHA-256, corpus/split/vocabulary SHA-256, exact snapshots and a prepared-artifact hash. Changed tensors/snapshots are rejected. These hashes detect accidental changes; they are not signatures against deliberate tampering. Preserve the original raw corpus to regenerate the run.

## Splitting and leakage prevention

Default seed: `day5-v1`; requested participant ratios: `0.70/0.15/0.15`. The reused `participant-fisher-yates-v1` algorithm assigns whole participants, including all sessions, to a single split. Integer group sizes depend on available signers. Required label coverage is checked on actual sample assignments.

`prepare` creates `dataset/splits/day5-v1.json` exclusively if absent, or loads it authoritatively if present. A locked manifest must match the corpus/vocabulary hashes, seed and ratios. A plain Day-4 split without corpus hashes is not a complete Day-5 lock; use Day-5 `prepare` to create the default lock, while Day-4 `split` remains useful for inspection. Do not delete/regenerate the test assignment to improve results. If collection changes the corpus, predeclare a new dataset version and evaluation protocol rather than silently replacing the old split.

No dataset mean/std is learned. `normalization.json` explicitly records `method: none`, `fittedSampleIds: []`. Per-clip geometry uses only that clip, so held-out values cannot affect training normalization. Fitting and optional augmentation use train only; early stopping/model selection use validation only. Test tensors are transformed during preparation but never supplied to fitting or selection.

Final evaluation claims `<split-file>.test-used.json` with exclusive creation, after verifying the locked manifest hash and before prediction. This blocks reuse across experiment directories sharing that lock. Failed attempts remain recorded for audit; do not erase the claim and repeatedly tune on test outputs. This local guard does not prevent someone deliberately copying/renaming locks or deleting audit files.

## Exact preprocessing version `bdsl-temporal-v1`

The final input is **`[numberOfSamples, 32, 128]`, float32**. Sequence length is configurable in `config/baseline-v1.json`; input/model/export all derive feature count from the same constants.

| Index | Meaning |
| --- | --- |
| 0–62 | Left hand: `x0,y0,z0,...,x20,y20,z20` |
| 63–125 | Right hand: same 21-landmark order |
| 126 | Left present: 0 or 1 |
| 127 | Right present: 0 or 1 |

Day-4 validation rejects unordered or duplicate offsets, invalid/nonfinite coordinates, unknown/inactive labels and rejected samples. The pipeline does not sort or silently repair invalid captures. Usable coordinates stay in their fixed physical left/right slots. On unmirrored input, the existing handedness convention maps MediaPipe raw `Right` to left and raw `Left` to right when confidence is at least 0.8. Uncertain observations remain unassigned and do not become model coordinates. Preview mirroring is CSS only; coordinates are never flipped.

Origin is the mean xyz of the reliably assigned wrist(s) in the first valid frame. Scale is the maximum absolute displacement from that **shared origin across all assigned landmarks in the complete clip**. Subtract that origin and divide by that one scale for both hands. Reject nonfinite or degenerate scale (`<=1e-8`). This preserves relative xy placement and movement of both hands instead of independently centering them. MediaPipe z is wrist-relative per hand, so it does not represent calibrated inter-hand depth. Absolute image location, absolute scale and absolute duration are not separate input features; this invariance can remove useful linguistic cues and requires real evaluation.

Target timestamps are `durationMs * i / (T-1)` for `i=0..T-1`. Use exact observations where available; otherwise interpolate only between adjacent frames with the same hand present and gap `<=250 ms`. Never bridge missing-hand frames or longer gaps, and never extrapolate beyond the observed interval. Missing coordinates and that hand's mask are zero. At least eight target frames must contain a hand. The final target can be missing if recording duration exceeds the last detector timestamp. This is intentional, not extrapolated motion. All-zero frames are masked by the recurrent layer; partially missing frames retain the two explicit hand masks.

Label indices follow active, reviewed vocabulary order and are saved with Bengali text, never alphabetically resorted. The v1 transformation needs the complete clip for scale and duration. Later browser inference must buffer a bounded isolated-sign clip/window and reproduce this exact transformation; it is not a causal continuous recognizer.

Optional training-only coordinate jitter (`±0.005` in normalized units) is seeded and **disabled by default**. It modifies only present coordinates on a clone, preserving missing zeros/masks. Validation/test augmentation is rejected. No horizontal flipping, class weights, temporal augmentation or performance-improvement claim is included.

## Models, training and selection

Both compact models use `Masking(0) → GRU/LSTM(32) → Dropout(0.2) → Dense(16,relu) → Dense(C,softmax)`. `C` comes from reviewed active labels. No real model is constructed with the current empty label map.

With default dimensions: GRU has **15,984 + 17C** parameters; LSTM has **21,136 + 17C**. The actual two-class synthetic mechanics checks reported 16,018 and 21,170 respectively. These are not models of the provisional 12-label vocabulary. Every candidate saves its actual summary and parameter count.

Defaults: Adam `0.001`, one-hot categorical cross-entropy, batch 8, maximum 40 epochs, seed 4105, patience 6 and minimum validation-loss improvement `0.0001`. The initialization, training permutation and dropout are seeded. CPU numerical/library/platform differences still prevent a cross-platform bitwise guarantee. There is no LR schedule, class weighting or hyperparameter search.

Best checkpoints are saved when validation loss improves by the configured minimum delta. Evaluation/export reload those saved weights, never the last in-memory epoch. Candidate selection uses lowest saved validation loss, with fewer parameters as exact-tie breaker. Tiny differences on one split do not establish superiority. Both candidates use the same data/configuration. Training failures preserve error/history logs; old runs and candidate directories are not overwritten.

## Metrics and figures

The selected checkpoint receives one final held-out evaluation. Artifacts contain mean clipped categorical cross-entropy, accuracy, macro/weighted precision/recall/F1, all per-class metrics/support, true-row/predicted-column confusion counts, unsupported class IDs, and actual test participant/session/sample counts. Zero divisions return 0; macro metrics include every configured class, even zero-support classes. Formal readiness blocks missing class coverage rather than silently removing classes.

Each real candidate writes `loss.svg`, `accuracy.svg` and `history.json`; final evaluation writes `confusion.json`, `confusion.svg`, `per-class-f1.svg`, `per-class.csv` and `metrics.json`. SVG labels request Noto Sans Bengali with system fallbacks. Rendering requires an installed Bengali-capable font; numeric indices and Unicode JSON/CSV retain interpretable class mappings when glyphs are missing. No font is downloaded automatically. Temporary figure tests are visibly marked **SYNTHETIC TEST ONLY** and removed afterward. No formal result figures exist today.

Timings record preprocessing, per-epoch/total training, and final CPU single/batch prediction; checkpoint size and parameter count are available. They are development measurements, not browser FPS, meeting latency or statistically controlled benchmarks.

## Reproduction after real data is ready

All commands below run from the client repository. `bdsl-v1-run001` must be a new run name. First complete human vocabulary review/activation and collect valid consented recordings covering all labels across enough signers. These commands intentionally fail until readiness passes.

```bash
npm run dataset -- validate --input dataset/raw --seed day5-v1
npm run temporal -- readiness
npm run temporal -- prepare --run bdsl-v1-run001
npm run temporal -- gru --run bdsl-v1-run001
npm run temporal -- lstm --run bdsl-v1-run001
npm run temporal -- select --run bdsl-v1-run001
npm run temporal -- evaluate --run bdsl-v1-run001
npm run temporal -- export --run bdsl-v1-run001
npm run temporal -- compare --run bdsl-v1-run001
```

Alternatively, **instead of** the manual sequence, use a new run ID:

```bash
npm run temporal -- reproduce --run bdsl-v1-run001
npm run temporal -- compare --run bdsl-v1-run001
```

`reproduce` prepares, trains both, selects, evaluates and exports. It does not bypass an already-consumed final-test lock. Do all validation-based development before consuming that lock. A custom reviewed vocabulary/bundle can be supplied at readiness/preparation using `--vocabulary path/to/manifest.json --input dataset/exports/your-bundle.json`; later commands read the saved run. To change configuration use `--config research/temporal/config/your-version.json` at preparation, preserving the split seed/ratios for repeated validation experiments on the same locked corpus.

Browser comparison uses an installed Chromium, `/usr/bin/google-chrome`, or `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. If none is installed, install the existing Playwright package's Chromium with `npx playwright install chromium`. That optional download was not needed/run for Day-5. Comparison uses local script/weights and validation inputs only, with maximum absolute error tolerance `0.0001`. It rejects mismatch/nonfinite output and writes `cross-runtime.json` only on success. There is currently no real export to compare; a Node checkpoint round-trip does not count as browser comparison.

## Artifact layout and export contract

```text
research/temporal/generated/<unique-run>/
  run.json                       # timestamp, Git/runtime, dataset statistics, timing, integrity hash
  source-files.json              # immutable raw paths/checksums
  prepared.json                  # split-derived sequences with source IDs
  config.json, labels.json, normalization.json
  vocabulary.json, split.json
  gru/ and lstm/
    summary.txt, candidate.json, model.json, weights.bin
    history.json, loss.svg, accuracy.svg
  selection.json                 # validation evidence only
  evaluation/
    metrics.json, confusion.json, confusion.svg, per-class-f1.svg, per-class.csv
  REPORT.md
  export/
    model.json, weights.bin       # authoritative native TF.js model, no conversion
    inference-contract.json, labels.json, preprocessing.json, normalization.json
    comparison.json              # validation input/expected output; keep private
    cross-runtime.json           # after successful browser comparison
```

Large artifacts/checkpoints/derived data live under the Git-ignored generated directory; raw/splits/exports remain ignored under the existing Day-4 policy. Do not serve private comparison inputs as public assets. Source snapshots and CLI configuration are enough to regenerate when the unchanged raw corpus is retained. The checked-in reports contain no raw sample data or synthetic recognition scores.

Export requires a real selected/evaluated run and unchanged checkpoint. It copies the native LayersModel into its own temporal export directory, reloads it, validates input/output dimensions, and saves validation predictions for comparison. No synthetic checkpoint is exported as a thesis model and `public/model` is never replaced.

The versioned contract records model/vocabulary/preprocessing versions, checksums, exact label order, float32 shape/layout, shared normalization, masks, timestamp policy, handedness/mirroring, softmax interpretation and unsupported conditions. Probabilities are uncalibrated; Day-5 selects no confidence threshold. For future browser integration, refactor/reuse `preprocess.ts` without changing its formula and enforce contract compatibility. First establish real held-out evidence and export comparison, then implement bounded clip inference and explicit user-confirmed caption sending; preserve the existing static mode and meeting lifecycle. Continuous sentence recognition remains separate research.
