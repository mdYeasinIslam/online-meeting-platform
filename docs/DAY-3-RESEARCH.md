# Day-3: static BdSL alphabet baseline and ephemeral captions

## Evidence and baseline

The current engine is a **static alphabet classifier**, not a temporal word or continuous BdSL sentence recognizer. No model was trained during Day-3. The future temporal model remains incomplete.

Evidence is in `public/model/model.json`, `group1-shard1of1.bin`, `labels.json`, and `src/@modules/sign-recognition/{static-engine,normalization,stabilizer}.ts`.

The engine uses the first detected hand only: 21 landmarks × x/y/z = 63 scalar features per frame. Although MediaPipe tracks up to two hands, the current classifier does not combine them, use pose, buffer time steps, or detect word boundaries. The wrist (landmark 0) is subtracted from every coordinate. The centered coordinates are divided by the maximum absolute coordinate across that hand, then flattened in landmark order (x, y, z). A zero-span hand remains zeros. This is not rotation/mirroring normalization.

The exported Sequential architecture is:

```text
63 features
→ Dense 128, ReLU
→ BatchNormalization
→ Dropout 0.3
→ Dense 64, ReLU
→ BatchNormalization
→ Dropout 0.2
→ Dense 36, softmax
```

The artifact reports Keras 3.13.2 and TensorFlow.js Converter 4.22.0. Its training configuration records Adam (learning rate approximately 0.001) and sparse categorical cross-entropy. These metadata do not establish which dataset, split, epochs, augmentation, signer population or actual training procedure produced the model. Those details are unknown and require confirmation. No accuracy or generalization claims can be inferred from the artifact.

The exact trained class labels, in index order, are:

```text
অ আ ই ঈ উ ঊ ঋ এ ঐ ও ঔ ক খ গ ঘ ঙ চ ছ জ ঝ ঞ ট ঠ ড ঢ ণ ত থ দ ধ ন প ফ ব ভ ম
```

There are 36 labels, with no trained space, delete or confirm gestures. Editing/sending uses explicit buttons. The draft is recognized output, not a manually typed sign-caption field.

### Pre-existing loader defect corrected

The Keras weight manifest names the tensors `sequential/dense/kernel`, etc., while TensorFlow.js layer weights expect `dense/kernel`, etc. The previous `strict: false` loader could run without assigning the saved weights. A direct comparison confirmed the old loaded dense weights did not match the artifact. Day-3 removes only the `sequential/` prefix in the in-memory loader and assigns weights strictly. All 14 loaded tensors now match their saved values exactly. Asset files, architecture, normalization and trained values are unchanged. The loader owns and disposes temporary tensors and the model on failed strict assignment, preventing repeated error/retry leaks.

## Runtime and ownership

```text
Existing LiveKit local camera track
→ recognition-only attached video element (same stream)
→ pinned MediaPipe Hands
→ first-hand landmark frame
→ StaticAlphabetEngine
→ PredictionStabilizer
→ accepted alphabet/token
→ local RecognizedDraft
→ explicit user Send caption
→ CaptionTransport.publish
→ LiveKit reliable data packet
→ validation + authenticated sender attribution
→ bounded session caption feed
```

Recognition starts only after the local user enables it with an active camera and connected meeting. A single serialized inference loop targets at most 10 FPS. It never opens a second getUserMedia stream, clones the camera, or stops the LiveKit-owned track. Stop detaches only its own video element and stops scheduling. Turning the camera off or losing the connection pauses inference. When the camera and connection return, inference resumes automatically **only if the user's recognition toggle remains enabled**. Leaving disposes the model and MediaPipe tracker.

The tracker and model are loaded once per mounted meeting recognition session, retained across Stop/Start and camera pause/resume, and disposed on unmount. In-flight initialization/inference settles before disposal or reattachment. Cancellation generations suppress obsolete callbacks. No raw landmarks are logged or broadcast. Diagnostics are opt-in and local: phase, raw label/confidence, last accepted label, latest full-frame pipeline latency, and effective FPS.

The UI distinguishes idle, loading MediaPipe, loading model, ready, recognizing, no hand, unknown/low confidence, paused, missing model assets, initialization error, inference error and stopped states.

## Stabilization

The typed defaults live in `src/@modules/sign-recognition/stabilizer.ts`; meeting timing/MediaPipe options live in `config.ts`.

| Parameter | Actual default |
| --- | --- |
| Confidence threshold | 0.80 |
| Sliding window | 8 observations |
| Majority ratio | 0.75 |
| Minimum stable observations | 6 |
| Cooldown between accepted outputs | 1200 ms |
| No-hand reset | 500 ms |
| Target inference rate | 10 FPS maximum |
| Diagnostic refresh interval | 500 ms (state changes/accepts update immediately) |
| MediaPipe maximum hands | 2 (classifier uses first only) |
| MediaPipe model complexity | 1 |
| Detection / tracking confidence | 0.7 / 0.7 |

The window must fill; the winning label must equal the current prediction, have at least six observations and at least 75% of the window, differ from the last emitted label, and pass cooldown. Unknown/low-confidence frames clear the window. No-hand frames clear the window immediately and clear duplicate suppression after 500 ms. Reset clears all state. When a custom window/ratio is supplied without a custom minimum, the minimum is derived as ceil(window × majority ratio).

Holding one static sign therefore emits once, not every frame. To repeat the same alphabet, remove the hand long enough to reset, then hold it again. This is a UI baseline heuristic, not measured linguistic sign-boundary detection.

The draft stores whole accepted tokens. Backspace removes the last token, preserving Bengali combining sequences. Clear/edit are local. Send blocks duplicate clicks, preserves text on failure and reuses the same UUID for an unchanged retry. Only the successfully submitted prefix is cleared; tokens accepted during an in-flight send remain. Reliable transport success is not a receipt from every participant.

## Caption domain and wire protocol

The shared domain item is `{ id, participantId, participantName, source, text, timestamp }`. Source is `sign | speech`; no speech recognizer exists. All timestamps are integer Unix epoch **milliseconds**, serialized as JSON numbers. The protocol and limits are in `src/@modules/captions/{types,config,protocol}.ts`.

The wire envelope is:

```json
{
  "version": 1,
  "type": "caption",
  "payload": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "participantId": "sender-id",
    "participantName": "Sender name",
    "source": "sign",
    "text": "ক",
    "timestamp": 1700000000000
  }
}
```

This is a schema illustration, not a transmitted caption. Current messages require a timestamp inside the allowed window.

| Limit | Value |
| --- | --- |
| LiveKit topic | `bdsl.captions.v1` |
| Payload encoding | UTF-8 JSON |
| Maximum complete application packet | 8192 bytes |
| Maximum text | 500 Unicode code points |
| Message ID | UUID v4 |
| Payload identity / name | 128 / 120 characters maximum |
| Timestamp acceptance | no more than 5 minutes old or 60 seconds ahead |
| Retained feed | 200 captions |
| Retained dedup keys | 400 |
| Receiver/sender rate | 5 valid new captions per sender per 10 seconds |
| Tracked rate buckets | 64 maximum |

The installed `livekit-client@2.20.1` supports `localParticipant.publishData(bytes, { reliable: true, topic })` and `RoomEvent.DataReceived`. The existing room is reused. There is one listener per transport instance; React lifecycle cleanup unsubscribes/disposes it. Data is not persisted or forwarded through Express.

Incoming bytes are length-checked before decoding, decoded using fatal UTF-8 into `unknown`, then narrowed using runtime checks. Invalid JSON, unknown fields/types/versions, absent fields, invalid source/UUID/time, empty/oversized/control-character text and malformed Unicode are ignored. Text is normalized to NFC and rendered as normal React text, never HTML.

The receiver resolves the actual event participant against the existing Room's remoteParticipants. It overwrites the payload's identity/name with that authenticated participant's identity/name. Caption keys combine this trusted identity and the wire UUID, preventing another sender from suppressing a caption by reusing its UUID. No payload can add a host badge or grant moderation. Sender attribution authenticates **who sent text**, not whether they genuinely performed a sign; modified clients can still send arbitrary text as themselves.

LiveKit reliable data is best-effort, not offline history or exactly-once delivery. Connected receivers normally receive it; disconnected/late participants do not get server replay. Receiver-side ID deduplication suppresses retries within its bounded retained set. History is arrival-ordered; sender clocks do not reorder the feed. A disconnected sender preserves their draft for an explicit retry. Clock skew outside the documented window causes rejection.

References: [LiveKit data packets and reliability](https://docs.livekit.io/transport/data/packets/), [local track attachment](https://docs.livekit.io/reference/client-sdk-js/classes/LocalVideoTrack.html).

## Privacy

TensorFlow.js/MediaPipe inference and landmarks remain in the browser. This application does not store inference frames/landmarks or send them to Express. The meeting's existing audio/video still travels through LiveKit to participants as part of conferencing. Model/MediaPipe assets are downloaded; the pinned MediaPipe assets come from jsDelivr. Captions are sent through LiveKit only after confirmation, held only in each client's bounded memory, and not written to MongoDB. Refresh/leave clears the local session feed. Late joiners start empty. This implementation does not add end-to-end encryption or recording and does not make claims about external infrastructure retention policies.

## Verification and metrics

Automated tests compare every loaded model tensor to the saved weights and run 200 synthetic-vector inferences. A local Node CPU observation measured approximately **0.39 ms mean per model inference**, with **14 tensors** stable while loaded and the count returning to baseline after disposal. This is a development observation on synthetic inputs, excludes browser tracking/video work, and is not formal thesis evaluation or accuracy. Corrupt/missing weight assignment also returns to the baseline tensor count.

Browser tests exercise real MediaPipe/model loading on a synthetic camera, confirm one model/shard/labels request across restarts and camera reuse, and test actual LiveKit caption receipt with explicitly injected test packets. They do not establish real-sign correctness or recognized-user-caption quality. With two synthetic-media participants connected, a final headless Chrome sample in the no-hand state recorded **389.6 ms** for the last tracking pipeline frame and **2.5 effective FPS**. Received audio bytes and decoded remote video frames continued increasing in both directions while recognition was enabled. Earlier samples were about 472–527 ms and 2 FPS. These observations are machine/run-specific, not a guarantee of 10 FPS or a human-sign evaluation. See DAY-3-DELIVERY.md for final test results and the exact manual procedure.

| Future measured metric | Current status |
| --- | --- |
| Held-out test accuracy | Unknown; requires a documented dataset/split |
| Macro precision / recall / F1 | Not measured |
| Confusion matrix | Not produced |
| Browser classifier latency on representative signs | Not measured |
| Effective FPS on representative signs/devices | Not measured |
| Signer-independent word/sentence performance | Not applicable to this static baseline |

## Future temporal integration boundary

`SignRecognitionEngine` already accepts typed hand/optional-pose frames and may retain a temporal buffer internally. A future engine can emit accepted words/tokens into the same draft/controller and transport without making the engine call LiveKit or changing the caption UI. The future speech source can use the same source-aware publishing interface. Choosing dataset vocabulary, two-hand/pose features, temporal segmentation, signer-separated splits, evaluation methodology and the temporal architecture is Day-4 research/development work; training and sentence-recognition claims were not added here.
