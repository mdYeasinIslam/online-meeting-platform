# GRU V3 phrase training collection

Use the existing route: **http://localhost:3000/research/data-collection** (`npm run dev` from the frontend directory). No second collection route was created. The existing authentication wrapper is unchanged.

## Modes and compatibility

The **Collection mode** selector defaults to **Existing Research Collection**. Its vocabulary, reviewed-label requirements, four-second recorder, timestamp-based research preprocessing, bundle kind `bdsl-temporal-landmarks`, validators and CLI contract are unchanged.

Choose **Phrase Training Collection** for a separate versioned contract. Mode switching is blocked while the camera is running, a take/import is pending, or accepted samples remain in memory. Save and remove queued samples before switching. Switching modes resets that mode's temporary settings/progress receipts; files already saved on disk remain intact.

The phrase mode imports the dedicated [phrase vocabulary](dataset/manifests/phrase-v3-vocabulary.json). Existing manifests are not overwritten.

| Class | ID | Bangla | Category |
| --- | --- | --- | --- |
| 0 | hello | হ্যালো | Phrase |
| 1 | good_morning | শুভ সকাল | Phrase |
| 2 | good_night | শুভরাত্রি | Phrase |
| 3 | how_are_you | আপনি কেমন আছেন? | Phrase |
| 4 | i_am_fine | আমি ভালো আছি | Phrase |
| 5 | good_afternoon | শুভ অপরাহ্ণ | Phrase |
| 6 | unknown | অচেনা বা অসমর্থিত ইশারা | Negative gesture |

Definitions remain **provisional**, with no expert-review claim. Pilot acknowledgement enables deliberate pilot collection but never changes that status. Establish consistent references and signing variants with qualified BdSL signers before a validated collection study; any later reviewed vocabulary needs a separate versioned contract.

`unknown` has variable hand usage and no forced static/dynamic phrase definition. Collect deliberate unsupported movements, stationary hands and incomplete phrases under that manually selected label. Empty/no-hand background recordings are rejected. No model predicts labels, trains on captures, or automatically accepts samples.

## Collect real recordings

1. Select Phrase Training Collection. Enter a pseudonymous participant ID such as `P001` and session ID such as `S001`. Use the **same participant ID for the same person across every session**. Changing the participant clears current consent.
2. Confirm participant consent and acknowledge the provisional pilot definitions. These are local assertions, not expert or ethics-board approval. Keep identities and consent records separately.
3. Explicitly select the intended phrase or negative category. Set duration to **4, 6 or 8 seconds**, countdown to **0–10 seconds**, and the per-class target (default **20**, total 140 recordings).
4. Start camera. The shared research/inference tracker uses unmirrored front-camera pixels, ideal 640×480, two hands, complexity 1, detection/tracking thresholds 0.7 and target 15 FPS. Video and green overlay are mirrored together. Raw versus accepted hand counts, processed FPS and reported handedness scores are shown.
5. Record sample, sign during the capture interval, and optionally choose Stop take and review. Manual takes must last at least two seconds; the selected duration remains the maximum. A countdown can be cancelled without creating a take.
6. Review the selected label, frame counts, valid coverage, FPS, capture gaps and structural quality. Click **Accept sample** (or Accept with warnings) only after verifying the intended sign. Capturing/reviewing alone adds nothing to the queue.
7. Discard incorrect takes, use **Discard and re-record** to begin another countdown immediately, or delete an accepted local sample and explicitly record a replacement. Deleting does not edit previously downloaded files.
8. Use different real takes, participants, speeds, lighting and sessions. Do not collect near-identical frames or count repeated copies as new data. Capture quality checks cannot establish sign correctness or recognition accuracy.

Stopping the camera cancels unfinished capture but preserves an existing review. No webcam audio/video file is retained. Data is memory-only; refresh/navigation loses unsaved captures and progress.

## Export, capacity and import

The local queue is bounded at **100 samples / 20 MiB**. Exports are split into individually downloadable **5 MiB** parts, each with a complete contract and mappings. A pending review survives capacity errors. At capacity, export the accepted queue, verify the files, confirm they were saved, and click **Remove downloaded samples from queue**. Only downloaded samples are removed, and only after that confirmation. Other samples and the pending take stay intact.

Per-class progress includes queued samples and confirmed saved-batch receipts while phrase mode remains open. Receipts retain only IDs, class indices and motion fingerprints, allowing duplicate screening after raw saved batches are removed. They do not persist across reloads or leaving the mode. The 20-per-class target is a progress guide, not an automatic labeler, acceptance rule or sufficient dataset size for generalization.

Import phrase JSON one batch at a time with the camera stopped and no pending take. The entire proposed merge is validated before the explicit **Accept validated import** button is shown. A failed import leaves the existing queue intact. Both duplicate IDs and exact normalized motion sequences are rejected, including across class labels and saved batches in the current visit. Motion screening uses a stable FNV pair, not cryptographic identity or fuzzy near-duplicate detection. Repeated normalized sequences across genuinely different recordings can also be flagged for human review.

Imported data must match the fixed class mappings, detector settings, consent/acceptance chronology, raw hand slots, quality and features. The validator reruns the shared preprocessor on imported raw frames and requires exact numeric feature parity. No accepted samples are silently relabeled or partially imported. Existing research JSON and phrase JSON are intentionally not interchangeable; each mode rejects the other contract.

## One shared preprocessing implementation

`PhraseCamera` reads raw MediaPipe results through `HandTrackingSession`. It calls the existing **`phraseFrame()`**, before any research collision filtering. The phrase recorder stores unnormalized xyz coordinates in the resulting physical-left/right slots with offsets from recording start. These raw slot frames are retained in exports for auditing; they do not include discarded low-confidence observations, camera images or world landmarks.

The existing **`preprocessPhrase()`** is called directly for review, acceptance validation and import validation. No parallel normalization/resampling algorithm was added. It uses:

- Unmirrored input; reported Right → physical-left slot, reported Left → physical-right slot.
- Handedness confidence ≥0.8, keeping the highest-confidence finite observation per slot.
- The first valid frame's present wrists as a shared fixed origin, and maximum absolute displacement across the whole take as a shared scale.
- 32 evenly spaced frame indices, floor/ceil interpolation, both bounding observations required for a hand, and a maximum measured adjacent-frame gap of 250 ms.
- 63 left xyz coordinates, 63 right xyz coordinates, then left/right binary presence masks. Missing-hand coordinates remain zero.
- Float32 assignment, followed by `Array.from(row)` before JSON serialization. No typed-array objects are serialized as numeric-key maps.
- At least eight valid capture frames, ≥60% hand coverage, and at least eight usable resampled rows. The phrase collection contract additionally requires 2–8 seconds and effective FPS ≥1, with low-FPS/gap warnings.

The research mode still uses its original collision rejection and timestamp-based transformer. Its behavior is not silently substituted into phrase training. Any future feature math or handedness change needs a new preprocessing version and coordinated inference/training change.

## Exact JSON contract

The complete structural JSON Schema is [phrase-training.schema.v1.json](dataset/manifests/phrase-training.schema.v1.json). Runtime validation additionally enforces float32 values, masks versus zeroed coordinates, raw-feature parity, recomputed quality, consistent labels, time relationships, duplicates and byte bounds.

The exported top-level object is exactly:

```json
{
  "schemaVersion": 1,
  "kind": "bdsl-phrase-training",
  "preprocessingVersion": "phrase-frame-index-v1",
  "inputShape": [32, 128],
  "vocabularyVersion": "bdsl-phrase-v3-pilot-v1",
  "vocabularyReviewStatus": "provisional",
  "labels": {
    "0": "হ্যালো",
    "1": "শুভ সকাল",
    "2": "শুভরাত্রি",
    "3": "আপনি কেমন আছেন?",
    "4": "আমি ভালো আছি",
    "5": "শুভ অপরাহ্ণ",
    "6": "অচেনা বা অসমর্থিত ইশারা"
  },
  "labelIds": {
    "0": "hello",
    "1": "good_morning",
    "2": "good_night",
    "3": "how_are_you",
    "4": "i_am_fine",
    "5": "good_afternoon",
    "6": "unknown"
  },
  "samples": []
}
```

Every sample has exactly these required fields (no hidden prediction or account data):

| Field | Type / meaning |
| --- | --- |
| `id` | UUID v4 |
| `participantId`, `sessionId` | `P` + 3–6 digits, `S` + 3–8 digits |
| `label`, `labelId` | Integer 0–6 and matching fixed machine ID |
| `capturedAt`, `acceptedAt` | UTC ISO timestamps; explicit acceptance must be after capture completion |
| `durationMs` | Actual bounded duration, number 2000–8000 |
| `requestedDurationMs` | 4000, 6000 or 8000 |
| `countdownMs` | Integer 0–10000 |
| `stoppedBy` | `manual` or `duration`; automatic stop matches requested duration |
| `preprocessingVersion` | `phrase-frame-index-v1` |
| `vocabularyVersion` | `bdsl-phrase-v3-pilot-v1` |
| `detector` | `{name:"@mediapipe/hands", version:"0.4.1675469240", selfieMode:false, maxNumHands:2, modelComplexity:1, minDetectionConfidence:0.7, minTrackingConfidence:0.7, handednessConfidence:0.8, targetFps:15}` |
| `orientation` | `{inputMirrored:false, previewMirrored:true, handedness:"swap-unmirrored", width:<integer>, height:<integer>}` |
| `consent` | `{confirmed:true, protocolVersion:"phrase-pilot-consent-v1", confirmedAt:<UTC ISO timestamp before capture>}` |
| `labelReview` | `{status:"provisional", pilotAcknowledged:true}` |
| `quality` | `{status:"accepted" or "warning", frameCount, validFrames, missingRatio, effectiveFps, maxGapMs, reasons:string[]}`; recomputed from raw capture |
| `values` | Ordinary numeric arrays `[32][128]`, float32-representable, finite, binary last-two masks |
| `frames` | Raw slot frames `{timestamp:<offset ms>, hands:[left,right]}`; a hand is `null` or exactly 21 `{x,y,z}` points; strictly increasing offsets within duration |

JSON canonicalizes negative zero to zero; they are numerically equivalent here. Raw slots preserve geometry before normalization but are not full video or a complete copy of every rejected MediaPipe observation.

## Google Colab loading example — no extraction or training

Upload all saved phrase batches in one Colab upload operation. This code reads already processed features; **it does not invoke Python MediaPipe, normalize again or train a model**.

```python
from google.colab import files
import json
import hashlib
import numpy as np

uploaded = files.upload()
version = "phrase-frame-index-v1"
ids = ["hello", "good_morning", "good_night", "how_are_you",
       "i_am_fine", "good_afternoon", "unknown"]
bangla = ["হ্যালো", "শুভ সকাল", "শুভরাত্রি", "আপনি কেমন আছেন?",
          "আমি ভালো আছি", "শুভ অপরাহ্ণ", "অচেনা বা অসমর্থিত ইশারা"]
expected_labels = {str(i): name for i, name in enumerate(bangla)}
expected_ids = {str(i): name for i, name in enumerate(ids)}
records, xs, ys = [], [], []
seen_ids, seen_motion = set(), set()

for filename, data in uploaded.items():
    bundle = json.loads(data.decode("utf-8"))
    assert bundle["schemaVersion"] == 1
    assert bundle["kind"] == "bdsl-phrase-training"
    assert bundle["preprocessingVersion"] == version
    assert bundle["inputShape"] == [32, 128]
    assert bundle["vocabularyVersion"] == "bdsl-phrase-v3-pilot-v1"
    assert bundle["vocabularyReviewStatus"] == "provisional"
    assert bundle["labels"] == expected_labels
    assert bundle["labelIds"] == expected_ids
    for sample in bundle["samples"]:
        label = sample["label"]
        assert type(label) is int and 0 <= label < 7
        assert sample["labelId"] == ids[label]
        assert sample["preprocessingVersion"] == version
        assert sample["quality"]["status"] in ("accepted", "warning")
        assert sample["consent"]["confirmed"] is True
        assert sample["labelReview"] == {
            "status": "provisional", "pilotAcknowledged": True}
        values = np.asarray(sample["values"], dtype=np.float32)
        assert values.shape == (32, 128) and np.isfinite(values).all()
        masks = values[:, 126:]
        assert np.isin(masks, [0, 1]).all()
        assert np.count_nonzero(masks.any(axis=1)) >= 8
        coordinates = values[:, :126].reshape(32, 2, 63)
        assert (coordinates[masks == 0] == 0).all()
        fingerprint = hashlib.sha256(values.astype("<f4").tobytes()).hexdigest()
        assert sample["id"] not in seen_ids, "Duplicate sample ID across batches"
        assert fingerprint not in seen_motion, "Duplicate normalized motion across batches"
        seen_ids.add(sample["id"])
        seen_motion.add(fingerprint)
        records.append(sample)
        xs.append(values)
        ys.append(label)

assert records, "Upload at least one accepted real recording"
X = np.stack(xs).astype(np.float32)           # [N, 32, 128]
y = np.asarray(ys, dtype=np.int64)            # [N]
participant_groups = np.asarray([s["participantId"] for s in records])
session_groups = np.asarray([s["sessionId"] for s in records])
labels = expected_labels
print(X.shape, y.shape)
print("Per-class counts:", np.bincount(y, minlength=7))
```

The TypeScript importer remains the full raw/features audit validator; this short Colab example performs loading/shape/mask/duplicate checks without reimplementing preprocessing. Keep participant IDs for signer-disjoint evaluation; do not randomly split near-identical takes or mix the same source recording across training and test. With only one signer, independent signer accuracy cannot be measured. More than 20 diverse recordings per class may be needed, and negative gestures cannot cover every unknown sign.

## Files in this implementation

Created:

- `dataset/manifests/phrase-v3-vocabulary.json`
- `dataset/manifests/phrase-training.schema.v1.json`
- `src/@modules/research/phrase-training/vocabulary.ts`
- `src/@modules/research/phrase-training/dataset.ts`
- `src/@modules/research/phrase-training/recorder.ts`
- `src/@modules/research/components/CollectionPreview.tsx`
- `src/@modules/research/components/PhraseTrainingCollection.tsx`
- `tests/helpers/phrase-training-fixture.mjs`
- `tests/phrase-training.test.mjs`
- `e2e/phrase-collection.spec.ts`
- `PHRASE-TRAINING-V3.md`

Modified:

- `src/@modules/research/components/DataCollection.tsx`: same-route mode ownership and shared preview; old research mode stays the default.
- `src/@modules/research/recorder.ts`: exports its existing platform clock/type for reuse; research duration/state behavior unchanged.
- `src/@modules/phrase-recognition/preprocess.ts`: exports the shared preprocessing version constant; no feature-math changes.
- `playwright.phrase.config.ts`: adds collection UI tests and opt-in synthetic-camera launch arguments.

The route's page/auth wrapper, research schema/validators/vocabulary/CLI, meeting code, backend, alphabet model, GRU weights and five-class phrase-demo mapping were not edited for this task. No training was run. The reported V2 100% training versus 16.67% held-out result motivates collection; it is not a new evaluation result from this implementation.

## Verification results — November 26, 2026

- `node --experimental-strip-types --test tests/phrase*.test.mjs tests/research-lifecycle.test.mjs tests/research-data.test.mjs`: PASS, all five files. The new phrase-training file contains 10 individual tests. Coverage includes the independent Python feature fixture, raw-handedness selection before research collision filtering, 4/6/8-second capture, configurable countdown, manual stop, explicit acceptance/discard, stationary-hand negatives, no-hand rejection, strict JSON import/export, mask/shape/nonfinite rejection, raw/features parity, duplicates across batches, capacity handling, JSON Schema field parity and unchanged research bundle roundtrip. Existing camera cleanup and repeated actual model inference tests pass.
- `node scripts/verify-phrase-model.mjs`: PASS, all five original reference samples; maximum probability difference `5.960464477539063e-8`.
- `npm run test:temporal`: PASS.
- `npm run typecheck`: PASS.
- Targeted ESLint covering every created/modified TypeScript/JavaScript file for this task: PASS.
- `npm run build`: PASS. Both original collection and phrase-demo routes remain; no additional collection route appears. Next.js needed its usual local CSS-worker ports outside the execution sandbox.
- `COLLECTION_CAMERA=1 npx playwright test --config playwright.phrase.config.ts`: PASS, 4 tests; 1 optional real-signer video test skipped because `PHRASE_VIDEO` was not enabled. Collection checks run the production UI with only authentication responses mocked (no backend accounts created). They verify mode switching/settings, explicit import acceptance, real JSON downloads, saved-batch counts/duplicate detection, no dataset POSTs/model loads in collection, and actual browser MediaPipe with a synthetic no-hand camera. The actual-detector test rejects background-only capture, re-records/cancels, and checks that all camera tracks end on stop. The original phrase-demo model loading/privacy smoke also passes. This does not measure physical-webcam sign quality or recognition accuracy.
- `node --experimental-strip-types --test tests/research-cli.test.mjs`: FAIL, the pre-existing `Unexpected end of JSON input` at line 17 caused by empty CLI stdout. This same failure predates this task; `scripts/dataset.mts` was not changed. Old bundle schema/validation compatibility is covered by the passing unit tests, but the CLI's existing test failure remains unresolved.

The browser checks initially exposed missing explicit accessible labels on two selectors; those labels were fixed, the app rebuilt, and all enabled checks rerun successfully. A local screenshot is available at `/tmp/phrase-v3-collection.png`.

The Colab snippet was supplied as an example, not executed against a Colab session in this task. NumPy is not installed in the local Python environment; no new dependency was installed. Python syntax was checked locally. Synthetic test coordinates are test-only data and must never be mixed into the real training dataset.

## Remaining limits

All queues, saved-batch receipts, settings and targets are in-memory; downloaded files are the durable copies. A browser cannot verify that a download was physically saved, hence the explicit confirmation before removal. Byte/count caps still require exporting and removing batches during a 140-sample collection run. Near-duplicate and semantic-label errors require human review. No new background/no-hand contract, expert-reviewed sign references, V3 model training or seven-class inference deployment was implemented. New samples still need consent, diverse real signers/sessions, careful labels and independent held-out evaluation.
