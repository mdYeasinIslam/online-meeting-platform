# Day-4 recording and dataset protocol

## Scope and review boundary

This is a limited-vocabulary, isolated word/fixed-expression **collection foundation**, not a trained temporal recognizer. No temporal model, automatic segmentation, translations, research accuracy, or formal evaluation is provided. The existing 36-class static alphabet demo and meeting composer remain separate.

The 12 semantic candidates in `dataset/manifests/vocabulary.json` are greeting, thanks, water, food, help, pain, stop, come, yes, no, repeat and finished. Their Bengali strings are display labels, **not verified sign definitions**. All candidates start provisional, unknown sign/hand type, and inactive. There were no authoritative vocabulary sign references in this repository. No sign descriptions or sources were invented. There is no rest vocabulary class: neutral/rest context and transitions are retained within a take, not labelled as vocabulary words.

Before collection, a researcher/supervisor or qualified BdSL signer should review the actual sign, regional variant, Bengali label, word versus fixed-expression scope, dynamic/static type, one/two-hand usage and suitability for this hands-only representation. Record a real reference URL when available, otherwise leave it null and document the review basis in reviewerNotes. Do not put a reviewer's private identity/contact details into a public manifest. Mark reviewStatus `reviewed`, fill known signType (`static` or `dynamic`) and handUsage (`one` or `two`), add reviewerNotes, then set active true. Increment the vocabulary version and preserve that manifest alongside its samples.

Copy the manifest to `dataset/manifests/vocabulary.local.json`, edit it, and load that JSON in the collection page. This requires no application code changes or deployment. Loading a manifest is local; it is a human review assertion and cannot authenticate expert approval. Every bundle must be validated with its matching reviewed manifest. Changing/deactivating a label requires keeping the historical manifest for historical samples.

## Consent and identities

The on-screen consent checkbox is an explicit collection gate. It records confirmation time and the consent wording/protocol version, not signed consent or proof of ethics approval. Obtain institution-appropriate consent separately before using it, including withdrawal, access, retention and intended research use. This template has not been approved by an ethics board or BdSL expert.

Assign a random/managed pseudonym `P` plus 3–6 digits (example P001) and a session ID `S` plus 3–8 digits (S001). Do not use names, initials, emails or authentication IDs. The format discourages direct identifiers but cannot enforce that a code is meaningful only as a pseudonym. Retain any re-identification key separately and privately. Keep a signer's participant ID identical across all sessions and files; different people must not share an ID. This is essential for meaningful signer-independent splitting.

Only normalized hand xyz landmarks, hand metadata, timestamps and pseudonymous collection metadata are retained. No audio, video files, face/body landmarks, MediaPipe result images or biometric identification are recorded. Preview pixels exist transiently in browser/detector memory. Detector JS/WASM/model assets download from pinned jsDelivr URLs; there is no research-data upload. Landmark trajectories may still be identifying/sensitive: do not describe the dataset as anonymous or publish it by default.

## Practical recording template

1. Review/approve the institutional consent procedure and selected vocabulary before recruiting participants. Do not infer sign validity from the provisional candidate list.
2. Open the client and sign in, then follow **Data collection**, or visit `/research/data-collection`. This uses the existing AuthGuard; after unauthenticated login the dashboard provides the Data collection link.
3. In a private research environment, assign the participant pseudonym and session ID, obtain consent, and confirm the on-screen checkbox. No real name belongs in the collection page.
4. Load the reviewed manifest before collecting a batch. Select its active label. If no labels are active, recording remains disabled.
5. Use a stable, well-lit location with an uncluttered background. Position the camera to keep both hands and the whole intended motion visible. Avoid backlighting, occlusion and camera movement. Keep orientation and framing unchanged during each take. No recording conditions or participant diversity have yet been established empirically.
6. Click Start camera and grant camera permission. Wait for a visible preview and `Camera/detector: ready`. Confirm the camera is a normal unmirrored source; the display itself is mirrored. Check handedness with a known physical left/right hand. If using a virtual or already mirrored camera, stop: this version's swap policy is not calibrated for that input.
7. Start from a neutral/rest position. Click Record sample, prepare during the three-second countdown, then perform one complete reviewed sign naturally and return to rest during the four-second window. These durations are a starting protocol; adjust centralized configuration only after review, not by rushing a longer sign.
8. Stop take and review can end a recording early; takes shorter than two seconds are rejected. Cancel take discards the pending take but keeps preview available. Stop camera cancels active collection and releases the camera/detector. Participants can withdraw consent or stop at any time.
9. Review frame count, duration, observed FPS, missing/uncertain-hand rates and reasons. Accept a clean sample, explicitly Accept with warnings, or Discard. Structurally invalid or rejected samples cannot enter the accepted queue. Automatic quality is not evidence that the intended sign was performed correctly; an observer must check protocol adherence. There is no raw-video replay.
10. Repeat takes as agreed by the researcher, varying sessions and signers deliberately. There is no hardcoded required repetition count and no claim that a particular count establishes dataset adequacy. Take counters advance even if a take is discarded. Imported accepted takes inform later numbering in that session.
11. Export JSON before leaving the page. Samples are memory-only; navigation/refresh loses the queue. A browser unload warning helps for reload/closing, but ordinary in-app navigation must still be preceded by export. Clearing accepted samples always asks for explicit confirmation.
12. Store bundles privately in `dataset/raw/` (or another controlled local workspace), keep the matching manifest, validate, and inspect the report. Do not add the same export and its individual samples twice. Do not commit actual participants or recordings.

## Local import/export and capacity

The queue holds at most 100 samples and a 20 MiB serialized bundle. The browser validates JSON before accepting imports, rejects unknown fields and invalid types, and presents rejected/warning counts. Rejected imports cannot be accepted partially or silently discarded. Existing and imported IDs are checked together. Duplicate ID is rejection; suspiciously identical xyz sequences get an explicit warning. Export reconstructs only known schema fields and recomputes quality; it does not include auth state, names, emails, tokens or cookies.

No persistence or cloud service is added. Use small exported batches. A matching reviewed vocabulary must be loaded before importing samples. Structural validation cannot establish genuine consent, sign correctness, unique human identity, provenance or expert approval. Do not treat a passing import as research certification.

## Dataset commands

From `online-meeting-platform`, with Node 22 TypeScript stripping (already used by this repository):

```bash
npm run dataset -- vocabulary
npm run dataset -- validate --input dataset/raw --vocabulary dataset/manifests/vocabulary.local.json
npm run dataset -- stats --input dataset/raw --vocabulary dataset/manifests/vocabulary.local.json --seed thesis-day5-1 --output dataset/reports/report.json
npm run dataset -- split --input dataset/raw --vocabulary dataset/manifests/vocabulary.local.json --seed thesis-day5-1 --ratios 0.7,0.15,0.15 --output dataset/splits/split.json
```

`--input` accepts one JSON sample, one versioned JSON bundle, or a directory recursively containing JSON. The default input is `dataset/raw`; default vocabulary is the tracked provisional manifest. `validate`/`stats` exit nonzero for rejected data. Empty data validates structurally and reports zero/null, while split fails because it has fewer than three participants. Vocabulary validation can succeed while collectionReady is false—this means the provisional structure is valid, not reviewed.

The CLI stays inside its current working directory, rejects `..` and symlinks, limits nesting to eight, files/samples to 3000, each data file to 20 MiB and total bytes to 100 MiB. Vocabulary files are limited to 64 KiB. Output is JSON on stdout; optional output files are private mode 0600 and created exclusively. Existing output files are never overwritten; choose a new filename or deliberately remove old generated outputs. No imported sample ID or label is used as a filesystem path. Use a private working directory without concurrent untrusted filesystem modification; this is not a hardened multi-user file service.

## Splitting and leakage

Sort distinct participant IDs, shuffle with explicit seed using the versioned participant-fisher-yates-v1 algorithm, reserve at least one participant per split, then allocate remaining participants to the largest target-ratio deficit. Entire signers, sessions and sample IDs stay together. Sample ordering does not change results. Ratios target participant counts and are approximate for small groups; sample/class balance is not guaranteed. Split manifests contain participant IDs, sample IDs and per-label counts, not copied raw frames.

Generated assignments are audited for missing/duplicate samples and participant overlap. Duplicate IDs, rejected samples and identical landmark sequences block splitting until reviewed/deduplicated. Each missing active label in a split produces a warning. Fewer than three participants fails; fewer than ten warns that estimates will be unstable. No synthetic signers are generated to fill a split. Later grouped k-fold or leave-one-signer-out may be more suitable for a small study, but Day-4 implements no evaluation.

Potential leakage persists if one person gets multiple pseudonyms, shared source recordings are independently transformed, or preprocessing learns from validation/test data. Keep identity mapping consistent, deduplicate source takes, split before augmentation, and fit all learned preprocessing only on training data. Never report per-frame random splitting as signer-independent evaluation.

## Statistics and limits

Statistics come from supplied files: totals, unique usable participants, participant-qualified sessions, counts per label/person/session, duration/frame/FPS distributions, missing-or-unassigned frame rate, rejection/warning reasons. Metric distributions exclude rejected/duplicate samples and state that scope explicitly. `stats --seed ...` additionally reports grouped split sizes, participant counts, label coverage and audited leakage, or why splitting is unavailable. It does not imply model evaluation. No real temporal recordings existed at implementation time.

Hands-only landmarks omit face, posture and nonmanual markers, may confuse signs, and cannot establish BdSL semantic validity. Occlusion/handedness errors and device-dependent FPS remain. No exact FPS is assumed and no fabricated replacement hands or interpolated frames are inserted into raw samples. Repeated recording resource checks use synthetic cameras and unit fakes; human collection, expert review, long sessions and formal privacy/ethics review remain researcher tasks.
