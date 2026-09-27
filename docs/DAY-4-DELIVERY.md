# Day-4 delivery and verification report

1. **Existing repository and ML state found.** Separate Next.js client and Express/MongoDB server, existing session AuthGuard, meeting UUID routes, LiveKit media, ephemeral caption transport and confirmed static-sign drafts. Installed TensorFlow.js 4.22.0 and MediaPipe Hands 0.4.1675469240. The artifact is a Keras 3.13.2 / TFJS Converter 4.22.0 63-input → Dense128 → BN → Dropout → Dense64 → BN → Dropout → Dense36 model. Existing normalization subtracts the first hand's wrist and divides by the largest absolute centered coordinate; 36 Bengali alphabet labels remain unchanged. Camera lifecycle in `BrowserSignSession` reuses the meeting-owned track, serializes inference, and detaches/releases its own resources. Tests use Node TypeScript stripping and Playwright. Both worktrees were clean before Day-4.

2. **Existing temporal dataset.** No temporal sample files, dataset directory or research CLI existed in the inspected repositories. The prior `DAY-3-RESEARCH.md` documents the static baseline, not a temporal dataset. No real temporal sample was collected during this implementation.

3. **Architecture implemented.** A protected `/research/data-collection` route owns a separate camera and detector. Pure TypeScript modules separate vocabulary validation, raw schema, quality checks, handedness mapping, dataset codecs/statistics, splitting, and recording state from the React UI and browser lifecycle. A local Node/TypeScript CLI shares validation logic. No research backend/API, cloud upload or temporal inference was added.

4. **Vocabulary/review.** `dataset/manifests/vocabulary.json` contains 12 editable semantic candidates. Every entry is provisional, inactive, has unknown sign/hand type and no invented reference. Reviewed manifests can be loaded locally without code changes. Activation requires reviewed status, known sign/hand type and reviewer notes. This validates the review fields, not a person's qualifications or ethics approval. No rest-word class is included.

5. **Captured data.** Each frame stores monotonic relative timestamp, raw image-normalized xyz for 21 landmarks per observed hand, nullable left/right slots, unassigned observations, masks, reported handedness and its score. Detection confidence is null because the installed API does not expose that result. Samples include schema/UUID/manifest/label, pseudonymous participant/session, take number, timing, detector configuration, orientation/dimensions, consent confirmation, app version, frames and recomputed quality. No raw image/audio/video/account data is exported.

6. **Raw versus derived.** Raw coordinates are preserved. Day-5 wrist/scale normalization, sequence lengths, interpolation, padding, masks, wrist-motion context and optional velocity are proposals in `DAY-4-SCHEMA.md`, not implemented transformations or established optimal methods. The static 63-feature classifier is unchanged.

7. **Handedness/mirroring/missing hands.** The detector receives unmirrored input; only the preview is mirrored. MediaPipe's mirrored-input handedness convention is swapped to anatomical slots. Missing/low-confidence classification and slot collisions retain unassigned raw observations. No landmarks are fabricated. Camera-specific calibration with a real signer remains required. See the linked primary MediaPipe documentation in the schema report.

8. **Recording configuration.** `src/@modules/research/config.ts`: 3000 ms countdown, 4000 ms target capture, 15 target FPS, at most 360 frames, preview diagnostics at 250 ms and countdown status at 100 ms. Actual timestamps and observed FPS are retained; exact browser FPS is not assumed. Manual stop/cancel, consent withdrawal, stop-camera and unmount cleanup are supported.

9. **Quality thresholds.** The same config defines 2–8 s duration, at least eight assigned-hand frames, warning/rejection above 40%/90% missing-or-unassigned frames, FPS warnings below 5 and rejection below 1, handedness score 0.8, xy tolerance [-0.25,1.25], |z|≤2, one-second gap warning and two-hand coverage warning below 50%. These are engineering starting criteria requiring research review. Structural faults, bad IDs/references/timestamps and unknown schema/fields reject. Duplicate IDs reject; identical trajectories warn and block splitting.

10. **Storage/export.** Bounded browser memory only: 100 samples / 20 MiB serialized bundle. Review precedes acceptance; errors are visible and rejected imports cannot be partially accepted silently. JSON import/export recomputes checks, preserves Bengali text and excludes account/session secrets. Clear asks for explicit confirmation. Export before in-app navigation; there is no persistent queue.

11. **Files created, grouped.** All paths below are relative to their named repository.

    Client runtime (`online-meeting-platform`):
    - `src/app/research/data-collection/page.tsx`
    - `src/@modules/research/components/DataCollection.tsx`
    - `src/@modules/research/camera.ts`
    - `src/@modules/research/recorder.ts`
    - `src/@modules/research/frame.ts`
    - `src/@modules/research/config.ts`
    - `src/@modules/research/types.ts`
    - `src/@modules/research/validation.ts`
    - `src/@modules/research/vocabulary.ts`
    - `src/@modules/research/sample.ts`
    - `src/@modules/research/dataset.ts`
    - `src/@modules/research/split.ts`

    Research/tooling/tests (`online-meeting-platform`):
    - `scripts/dataset.mts`
    - `dataset/manifests/vocabulary.json`
    - `dataset/raw/.gitkeep`, `dataset/exports/.gitkeep`, `dataset/splits/.gitkeep`, `dataset/reports/.gitkeep`
    - `tests/helpers/research-fixture.mjs` (synthetic only)
    - `tests/research-data.test.mjs`
    - `tests/research-lifecycle.test.mjs`
    - `tests/research-cli.test.mjs`
    - `e2e/research-collection.spec.ts`

    Documentation (`online-meeting-platform`):
    - `dataset/README.md`
    - `docs/DAY-4-PROTOCOL.md`
    - `docs/DAY-4-SCHEMA.md`
    - `docs/DAY-4-DELIVERY.md`

    Server: no new files. `dataset/reports/empty-day4.json` is a locally generated, ignored report rather than a source deliverable. No fake research samples were placed in dataset/raw.

12. **Files modified, grouped.** Client: `src/@base/layouts/LandingHeaderUpdated.tsx` adds an authenticated Data collection link. Research/test configuration: `.gitignore` narrowly excludes private raw/exports/generated artifacts and local manifests; `package.json` adds the dataset command and isolates the new browser group; `playwright.config.ts` supports synthetic-camera opt-in and a test API port override. Docs: client `README.md`. Server: only `tests/e2e-server.ts` accepts `E2E_API_PORT` (default 5000). This allowed testing on 5001 without stopping the user's running dev server. Production server sources, auth, APIs, schemas and deployment are unchanged.

13. **Dependencies.** None added, removed or upgraded; both lockfiles unchanged. `npm ls --depth=0` showed an existing extraneous `@emnapi/runtime@1.8.1` installation before editing, with no missing/invalid direct dependency listed. That unrelated installation was not removed. Existing Node experimental-strip-types/module-type and Mongo test-binary version notices remain.

14. **Tests added.** Synthetic-only manifest/schema/one-and-two-hand/masks/handedness/invalid coordinates/time/quality/import/duplicates/statistics/splits/leakage cases, CLI filesystem/empty/error/output protections, recorder gating/countdown/cancel/dispose and camera initialization/serialization/late-permission cleanup. Three Playwright scenarios cover protected access, review/consent gates, synthetic import/counts/export/clear and actual MediaPipe using a synthetic no-hand camera with repeat/cancel/cleanup checks. No test fixture is represented as a valid BdSL sign.

15. **Validation results.** Provisional vocabulary structure validates: 12 labels, zero reviewed, zero active, collectionReady false. All unit/CLI synthetic validation cases passed; invalid samples and unsafe paths return errors/nonzero status. The empty real dataset validates structurally but contains no research evidence. Schema tests do not establish linguistic validity or consent authenticity.

16. **Splits/leakage.** Explicit seed, sorted participants and versioned seeded shuffle; proportions target signer counts. All sessions stay with their signer. Synthetic tests prove repeatability independent of input ordering, different-seed behavior on nine synthetic groups and leakage detection. Too few participants or unresolved invalid/duplicate data fails. Missing active labels and small participant groups warn. No real split exists because no real samples exist.

17. **Actual dataset statistics.** `dataset/raw/` contains zero JSON files, zero samples, zero participants and zero sessions. Per-label/participant/session maps are empty; duration/frame/FPS and missing-hand distributions are null/empty rather than invented zeros for measurements. Rejected/warning sample counts are zero because there are no inputs. Three-way splits are unavailable. The generated private report is `dataset/reports/empty-day4.json`.

18. **Typecheck/lint/tests/build.** Baseline client checks/build and all 65 pre-Day-4 unit tests passed. Day-4 client checks/build and 93 unit tests passed. Server typecheck/lint/all eight tests/build passed after its test-fixture change. Final client typecheck, lint, 93 unit tests and production build passed. All 15 real-service browser scenarios passed in three isolated groups (7 existing meeting/caption cases, 5 dashboard-join cases, 3 research cases). Both repositories passed git diff --check.

19. **Automated browser verification.** Research protected-route and synthetic import/export/clear scenarios passed after correcting test selectors. The actual detector scenario passed a targeted run: three no-hand takes were rejected, a single camera was reused, no audio was requested, detector assets were not re-requested per take, active cancellation and stop/restart/unmount track cleanup succeeded. Initial detector startup failed once in an earlier attempt; the cause was not established, and a subsequent instrumented run passed. Temporary diagnostics were removed. The final full run passed all 15 cases, including the research detector scenario without temporary diagnostics. Final research takes had 21/15/15 no-hand frames at 5.1/3.6/3.7 effective FPS. JS heap after forced GC was 7,642,552 bytes before and 8,030,800 after three takes; this remains a short development observation, not formal memory evaluation.

20. **Manual verification performed.** Repository/model/API-type inspection and review of test evidence/schema/commands were performed. No human signed into a physical camera for a manual sign-collection session. The provided manual protocol is a procedure to perform, not a claim that participant collection occurred.

21. **Unverified and why.** No qualified BdSL reviewer, consented human signer or real temporal dataset was available. Consequently sign definitions, human sign correctness, dataset validity/balance/diversity, physical handedness calibration and research utility remain unverified. Firefox/Safari/mobile cameras, long sessions and full WASM/GPU memory behavior were not evaluated. Browser tests use headless Chrome and synthetic camera input.

22. **Privacy/consent.** Explicit consent gate, pseudonymous ID formats, no account metadata in sample construction, strict imported field allowlists, local bounded memory, no audio/raw video retention/upload/cloud endpoint, reviewed-label gate, explicit clear confirmation, ignored private dataset folders, no paths derived from sample IDs, and traversal/symlink/file-size limits. Consent UI is not a signed consent system. Landmark motion is not guaranteed anonymous.

23. **Known limitations/performance observations.** Hands-only capture omits nonmanual markers and body context. Four seconds and quality thresholds require experimental review. Variable FPS and occlusion remain; labels can be structurally accepted without being linguistically correct. Memory is not persistent, so leaving loses unexported samples. One real person with multiple pseudonyms can defeat group splitting; identity consistency remains a research responsibility. A targeted development run measured 21/21/15 frames in approximately 4.09/4.19/4.17 seconds, effective FPS 5.1/5.0/3.6, all no-hand. After forced Chrome GC, JS heap was 7,569,624 bytes before and 7,967,988 after three takes; this small-run observation includes warm-up and is not a leak-free claim or a WASM/GPU measurement. Unit checks established no post-disposal callbacks and no overlapping sends. No formal performance evaluation is claimed.

24. **Run applications.** In separate terminals from the parent workspace:

    ```bash
    cd online-meeting-platform-server
    npm run dev
    ```

    ```bash
    cd online-meeting-platform
    npm run dev
    ```

    Existing configured environment values are used. Sign in, then click Data collection. HTTPS or localhost is needed for camera permission.

25. **Validate an exported dataset.** From the client repository, after manually preparing the reviewed matching manifest:

    ```bash
    npm run dataset -- validate --input dataset/raw --vocabulary dataset/manifests/vocabulary.local.json
    ```

26. **Generate dataset splits.**

    ```bash
    npm run dataset -- split --input dataset/raw --vocabulary dataset/manifests/vocabulary.local.json --seed thesis-day5-1 --ratios 0.7,0.15,0.15 --output dataset/splits/split.json
    ```

    Requires at least three genuine participant groups and resolved invalid/duplicate records. Generated output files are never overwritten automatically.

27. **Generate dataset statistics.**

    ```bash
    npm run dataset -- stats --input dataset/raw --vocabulary dataset/manifests/vocabulary.local.json --seed thesis-day5-1 --output dataset/reports/report.json
    ```

    To reproduce honest empty-directory statistics before vocabulary approval, omit `--vocabulary` and `--output`.

28. **Exact manual collection procedure.** Obtain research/vocabulary/consent review; assign stable P001-style participant and S001-style session codes; sign in and open Data collection; load the reviewed manifest; confirm participant consent; enter IDs/select label; start camera and verify physical handedness/framing; begin at rest; click Record sample; prepare for three seconds; perform one complete sign and return to rest in the capture window; stop/review; accept clean or explicitly accept warning samples, otherwise discard; repeat across agreed sessions; export before leaving; stop camera; privately store and validate bundles with the matching manifest. Full guidance and withdrawal/storage caveats are in `DAY-4-PROTOCOL.md`.

29. **Preservation of Days 1–3.5.** Existing auth architecture, creation/join semantics, LiveKit integration, static engine/weights/normalization/stabilizer, recognized draft and caption protocol were not edited. Existing unit tests remain in the suite. All 12 existing browser cases passed alongside the three new research cases in the final run, including actual LiveKit media, captions, recognition lifecycle and dashboard joins. No deployment changes or real samples committed.

30. **Recommended Day-5 task.** First obtain actual vocabulary/consent review and collect enough genuine signer/session/label coverage. Validate/deduplicate, freeze a manifest and signer-independent split, then implement separately versioned raw-to-feature preprocessing with fixed left/right slots, masks, timestamp-based resampling, justified normalization and retained motion context. Compare a small temporal baseline (for example one GRU baseline) against a simple reference with reproducible seeds and train-only fitted preprocessing; select settings using validation signers, evaluate held-out signers once, and report measured per-class counts/confusion matrix/metrics and limitations. If signer count is insufficient, design grouped k-fold/leave-one-signer-out rather than claim a reliable held-out result. Day-4 did not train or evaluate any model.
