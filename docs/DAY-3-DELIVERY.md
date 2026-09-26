# Day-3 delivery report

## 1. Day-1/Day-2 state found

Both repositories were clean at the start. Next.js owns UI/LiveKit/browser ML; Express owns authentication, MongoDB, meeting APIs and token generation. Authentication, meeting creation/lookup, protected routing, session-derived identities, camera/microphone controls, presence, leave/rejoin/refresh and seven-user presence were retained. Baseline typecheck/lint/unit tests/build passed in both folders (8 client and 8 server cases before changes).

The initial browser regression failed because the existing client environment points at a deployed API, while tests start a local isolated API. Rebuilding the test output with `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api` fixed the fixture mismatch without editing environment files. The default browser flow and actual LiveKit two-user media/capacity flow then passed before integration. Existing Node experimental/module warnings, the optional extraneous @emnapi/runtime package, test MongoDB version warning and Day-2's non-atomic provider capacity caveat remain pre-existing observations.

## 2. Existing ML implementation found, based on repository evidence

The existing TensorFlow.js MLP consumes 21 landmarks from the first hand, flattened into 63 x/y/z features after wrist-centering and max-absolute-coordinate scaling. It has Dense 128 ReLU, batch normalization, Dropout 0.3, Dense 64 ReLU, batch normalization, Dropout 0.2 and Dense 36 softmax. The 36 labels are Bangla alphabets; none are trained control gestures. The existing static engine, normalization and stabilizer were reused. No temporal engine was trained or completed.

A pre-existing loader defect was verified: permissive loading ignored the saved `sequential/`-prefixed weight names, leaving initialized weights. The new loader removes that prefix in memory, strictly assigns all weights, and cleans up on errors. Automated comparisons now match every one of the 14 saved weight tensors. Model/label/shard files are unchanged. Dataset, split, epochs and accuracy are unknown. See [research notes](DAY-3-RESEARCH.md).

## 3. Day-3 caption architecture implemented

The existing LiveKit camera is attached to a recognition-only video element. A single cancellable/throttled MediaPipe → static engine → stabilizer loop emits accepted tokens into a local recognized draft. The user edits whole tokens and explicitly sends. The model never calls LiveKit.

A model-independent `CaptionTransport` publishes a version-1 JSON envelope using the existing Room's reliable data API. Runtime validation, authenticated sender attribution, sender-namespaced UUIDs, bounded deduplication and rate limits precede delivery into a session-local 200-item feed. The UI displays names, Bangla text, source, time and local-user indication without HTML injection. Scroll-following pauses when the user scrolls up. There are no new rooms/connections, backend endpoints, persistent captions or history synchronization.

## 4. Files created, grouped by client/server/docs

Client, relative to `online-meeting-platform`:

- `src/@modules/captions/config.ts`
- `src/@modules/captions/protocol.ts`
- `src/@modules/captions/livekit-transport.ts`
- `src/@modules/captions/useMeetingCaptions.ts`
- `src/@modules/meeting/components/ConnectedMeeting.tsx`
- `src/@modules/sign-recognition/config.ts`
- `src/@modules/sign-recognition/model-loader.ts`
- `src/@modules/sign-recognition/browser-session.ts`
- `src/@modules/sign-recognition/draft.ts`
- `src/@modules/sign-recognition/recognized-draft.ts`
- `src/@modules/sign-recognition/useSignComposer.ts`
- `src/@modules/sign-recognition/components/SignCaptionComposer.tsx`
- `tests/captions.test.mjs`
- `tests/draft.test.mjs`
- `tests/model.test.mjs`
- `tests/recognition-lifecycle.test.mjs`
- `e2e/captions.spec.ts`

Server: none.

Docs (client repository): `docs/DAY-3-RESEARCH.md`, `docs/DAY-3-DELIVERY.md`.

## 5. Files modified, grouped by client/server/docs

Client:

- `src/@modules/captions/types.ts`: model-independent submission contract and sender-bound domain identity.
- `src/@modules/captions/feed.ts`: centralized Unicode-aware limits.
- `src/@modules/captions/useCaptionFeed.ts`: typed bounded history and updated ownership comment.
- `src/@modules/captions/CaptionPanel.tsx`: real session captions, timestamps, local indication, restrained scroll-following.
- `src/@modules/meeting/components/MeetingRoom.tsx`: mounts the connected caption/recognition session.
- `src/@modules/meeting/components/MeetingControls.tsx`: preserves media controls and accepts the functional local sign control.
- `src/@modules/sign-recognition/static-engine.ts`: strict corrected loader and asset/shape checks.
- `src/@modules/sign-recognition/stabilizer.ts`: explicit configurable minimum observations.
- `src/@modules/sign-recognition/components/StaticSignDemo.tsx`: clarifies that the standalone demo does not publish; meetings now provide the composer.
- `tsconfig.json`: allows explicit .ts imports so pure modules work in the existing Node TypeScript-stripping tests and Next.js.

Server: none.

Docs: client `README.md` updated for the current feature and testing instructions. No environment, model assets, package manifests/lockfiles, deployment settings, auth modules or server files changed. No Git commits or pushes performed.

## 6. Dependencies added, removed, or changed

None. Uses installed LiveKit client 2.20.1, LiveKit React components 2.9.24, MediaPipe Hands 0.4.1675469240 and TensorFlow.js 4.22.0. `publishData`/`DataReceived` were checked against installed definitions and official documentation. The test fixture uses the already-installed LiveKit protocol package for explicitly injected test packets.

## 7. Static recognition flow that currently works

The local recognition control requires a connected participant and usable camera. MediaPipe and the real preserved model load successfully. The camera stream is reused with no extra getUserMedia call. The loop produces no-hand/unknown/prediction states and stabilizes accepted tokens before appending them locally. Stop leaves the meeting camera on; camera off or disconnection pauses; recovery resumes if still enabled. Stop/Start reuses loaded resources; leaving disposes them.

The accepted-token → draft → explicit send flow is tested with injected predictions. **A person performing a real supported sign and sending that resulting draft was not observed in this environment.** No fake predictions or manual sign-text field were added to the application.

## 8. Caption behavior that currently works

Reliable topic `bdsl.captions.v1`, version 1, caption type, UTF-8 JSON, integer Unix milliseconds. Limits are centralized: 8192 packet bytes, 500 Unicode code points, UUID-v4 IDs, 200 retained captions, 400 retained dedup keys and 5 messages per sender per 10 seconds. Unsupported/malformed/oversized/empty messages are ignored. Text is normal React text, not HTML. Payload name/identity never override LiveKit sender metadata. Host status cannot be added through captions.

Publication succeeds before one local echo is inserted. Failure preserves the draft; an unchanged retry keeps its ID. New accepted tokens during an in-flight send remain after the submitted prefix clears. Captions are ephemeral; late joiners/refresh start empty. Reliable does not guarantee receipt by temporarily disconnected participants or provide exactly-once delivery outside the bounded dedup window.

## 9. Automated verification results

- **21 client cases across six test files:** protocol validation/version/type/size/time/Unicode, spoof override and ID namespacing, listener cleanup, reliable publication, failure/retry/local echo, rate limits, dedup/history, token editing, confirm-only sending, pending-send concurrency, stabilization, normalization, all trained weights, strict-failure cleanup and repeated-inference tensor stability.
- Lifecycle injection test proves one inference loop after repeated starts, one load across pause/resume, no inference after stop/dispose, balanced attach/detach and no camera-stop call.
- Server's unchanged eight tests pass, including auth/CSRF/token identity/scope/capacity checks.
- Default browser auth/invite/error regression passes; six service-dependent scenarios skip unless explicitly opted in.
- Actual LiveKit browser caption tests pass: separate authenticated Chrome contexts receive/deduplicate Bengali packets, ignore spoofed payload attribution, render markup as text, start with empty histories on late join/refresh, and continue meeting controls when another participant leaves. These packets are explicitly injected by tests, not claimed model output.
- Actual browser MediaPipe/model initialization, no second camera request, one model/shard/labels request across restarts, camera pause/resume, stop-with-camera-on, and missing-model-asset UI pass.
- Day-2 actual media, seven-user presence/full-room response, duplicate identity, rejoin/refresh, permission and navigation tests remain covered.

The full opt-in run passed six of seven scenarios and failed the existing audio-denial test because camera startup also failed. That scenario passed on targeted retry. Record this as a retry, not a clean first-attempt seven-test run. The expanded recognition/media scenario passed on the final build, checking both directions for increasing received audio bytes and decoded video-frame counters, nonzero audio energy and audio playback while recognition is enabled.

## 10. Manual verification results

Repository/model/configuration inspection, direct trained-weight comparisons and artifact preservation checks were performed. No human-operated sign-recognition trial, physical microphone listening session, or Firefox/Safari test was performed. Actual browser/media/transport observations above were automated with synthetic camera/audio devices.

## 11. Anything unverified and the exact reason

Real-sign recognition correctness and the full physical-sign → actual recognized draft → user Send path require a human demonstrating supported signs, which the synthetic camera cannot provide. Manual steps are below. Formal accuracy and signer generalization require labeled held-out data that is not present. Cross-engine/browser/device performance, long calls, live network-outage recovery and subjective audio/video quality were not established by these local Chrome checks. No deployment was attempted or changed.

## 12. Known limitations

This is a one-frame/one-hand static alphabet baseline, not continuous BdSL sentence recognition. The 36-class inventory is limited; there are no trained edit/confirm gestures. Camera ordering, rotation, occlusion, lighting and signer variation can affect results. The 10 FPS setting is an upper target; observed headless synthetic-camera tracking was approximately 2–2.5 FPS, so a full stabilization window may take several seconds on that environment.

Captions are best-effort ephemeral delivery, with bounded deduplication, no history replay, and a documented five-minute age / one-minute future clock-skew limit. Sender authentication does not prove text was actually recognized from a sign. MediaPipe requires access to pinned CDN assets. The pre-existing Day-2 simultaneous-admission capacity caveat remains unchanged; a server-side headcount check is not an atomic reservation if the provider ignores its configured room limit.

## 13. Actual stabilizer configuration and where defined

`src/@modules/sign-recognition/stabilizer.ts`: confidence 0.80, window 8, majority 0.75, minimum stable observations 6, cooldown 1200 ms, no-hand reset 500 ms. Low/unknown predictions clear stability; a held duplicate is suppressed until reset. Configurable minimum observations derive from a custom window/ratio if not explicitly supplied.

`src/@modules/sign-recognition/config.ts`: target 10 FPS, diagnostics 500 ms, MediaPipe max hands 2, complexity 1, detection/tracking thresholds 0.7. The classifier still uses only the first hand. `src/@modules/captions/config.ts` holds all caption protocol/feed/rate limits.

## 14. Actual model input/output details discovered

Input `[batch, 63]`, one hand's 21 xyz landmarks. Output `[batch, 36]`, class probabilities. Architecture and normalization are documented in the research notes. Exact index order:

`অ আ ই ঈ উ ঊ ঋ এ ঐ ও ঔ ক খ গ ঘ ঙ চ ছ জ ঝ ঞ ট ঠ ড ঢ ণ ত থ দ ধ ন প ফ ব ভ ম`

All 14 saved weight tensors match after the loader correction. No accuracy, dataset size or training result was fabricated. A development Node CPU sample across 200 synthetic vectors measured about 0.39–0.44 ms per pure model inference, with 14 tensors stable while loaded and baseline restored after disposal. This is not browser throughput or thesis evaluation. Headless-browser no-hand samples showed roughly 390–527 ms last-frame pipeline latency and 2–2.5 FPS; they include MediaPipe work and are not measurements on supported human signs.

## 15. Exact commands to run both applications

From the parent project folder, in separate terminals:

```bash
cd online-meeting-platform-server
npm ci
npm run dev
```

```bash
cd online-meeting-platform
npm ci
npm run dev
```

Use the existing environment configuration. No new variables are required. For a local two-browser test the client API URL must point to your local Express API, and its exact frontend origin must match the browser origin.

Checks in each folder: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

For isolated browser tests, stop ordinary servers on ports 3000/5000; the fixture starts its own servers and temporary MongoDB:

```bash
cd online-meeting-platform
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api npm run build
npm run test:e2e
DAY2_LIVEKIT=1 npm run test:e2e
```

The existing opt-in variable name is retained for both Day-2/Day-3 real-service tests. They use actual configured LiveKit with temporary rooms and synthetic browser devices, and delete test rooms at shutdown. They do not write test users/meetings to the real configured MongoDB. A later production build should use your intended normal environment URL.

## 16. Exact two-browser test procedure

1. Start client/server with matching API and frontend origins. Use localhost consistently, or reachable HTTPS for two physical devices.
2. Browser A: log in as User A, create an active meeting, copy its invite, select camera/microphone and Join.
3. Browser B/incognito: log in as a different User B, open that invite and Join. Confirm names, host badge and remote live video. With headphones/separate rooms, confirm speech in both directions.
4. A: click Start sign recognition. Confirm MediaPipe/model loading then a ready/no-hand/prediction state. Both meeting cameras/audio should keep working; no second camera permission prompt should appear.
5. Enable local diagnostics if useful. Perform a supported static alphabet from the exact label list above; hold it steady. Check raw prediction/confidence, but confirm B receives nothing yet.
6. After stability, confirm one token appears in A's local recognized draft. Continue holding it: it should not flood the draft or captions.
7. Remove the hand for at least 500 ms and allow the 1200 ms emission cooldown; repeat the same alphabet or another supported one. Confirm whole tokens append locally.
8. Use Remove last token and Clear draft. Confirm B sees no change and Bengali tokens are not split.
9. Build another recognized draft. Click Send caption once. A should see one caption with their name and `(you)`; B should see that text once with A's trusted name, Sign source and time. A's submitted draft clears only after publication succeeds.
10. Test a send failure by disconnecting the network before sending; do not clear the draft. Confirm the draft remains and the UI disables sending or reports a useful error. Restore connectivity and explicitly retry. A race during disconnection may have delivered a packet: repeated unchanged retries use the same UUID for deduplication.
11. To reproduce the spoof test safely, run the included `e2e/captions.spec.ts` real-service scenario. It sends a test packet from B claiming A's ID/name; A must display B as sender. No production debug/send backdoor is provided.
12. Turn A's camera off. Recognition should pause without repeatedly asking permission; audio can continue. Turn the camera back on: recognition resumes if its toggle remains enabled. The draft stays local.
13. Click Stop sign recognition. Confirm inference stops but A's meeting camera and remote video remain active.
14. Start again. Model assets should not redownload during that same mounted meeting session. A model-asset error should leave the camera usable; the included failure test simulates a 404.
15. B leaves: A's feed/recognition remain usable and B disappears from the grid. B rejoins and starts with an empty feed. Send a fresh confirmed caption and verify delivery.
16. Refresh B: history clears, explicit Join works again, and fresh captions arrive once. Old messages are not replayed.
17. Scroll B's caption panel upward while new captions arrive; scrolling should not be forced to the bottom. Use New captions to resume following.
18. Recheck mute/unmute, camera off/on, absolute invite copy and Leave. Leaving A stops recognition, disposes its resources and releases meeting media as before.
19. Repeat on your actual target browsers/devices and record latency/FPS and recognition mistakes separately from formal accuracy evaluation. A localhost invite on a second physical device points to that device, so use reachable HTTPS when necessary.

## 17. Typecheck, lint, test, and build results

| Check | Client | Server |
| --- | --- | --- |
| Dependency integrity | Passed; no dependency changes; pre-existing optional extraneous entry | Passed, unchanged |
| Typecheck | Passed | Passed |
| Lint | Passed | Passed |
| Unit/integration tests | 21 cases across 6 files passed | 8 cases passed |
| Production build | Passed | Passed |
| Default browser flow | Passed; real-service tests deliberately skip | Isolated API fixture exercised |
| Actual LiveKit browser scenarios | Passed across runs; one existing device scenario required retry as recorded above | Existing token/API paths exercised |

No type/lint checks disabled and no `any` or `@ts-ignore` added. Source/environment/model preservation is checked against the initial snapshot. Server checks refer to the unchanged server tree verified at baseline; no server implementation was necessary for captions because authenticated tokens already permit data publishing.

## 18. Exact recommended Day-4 task: dataset and temporal model development

Define the initial word/gloss vocabulary and annotation rules; inventory existing data and consent/licensing; collect or curate videos with signer/session metadata; design signer-independent train/validation/test splits before experimentation. Specify timestamped two-hand/pose features, handedness/mirroring normalization, missing-frame handling, sequence windows and sign-boundary labels. Implement a reproducible dataset/preprocessing/validation pipeline and document class balance, leakage checks and evaluation metrics (macro precision/recall/F1, confusion matrix, latency/FPS). Then select and baseline a temporal architecture against those splits under an explicitly approved training plan. Preserve `SignRecognitionEngine` → accepted text → draft/CaptionTransport so the future engine can replace the static baseline without redesigning the meeting UI. No Day-4 dataset collection or training was performed in Day-3.
