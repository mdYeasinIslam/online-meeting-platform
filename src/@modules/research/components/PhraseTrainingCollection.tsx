"use client";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import CollectionPreview from "./CollectionPreview";
import { PhraseCamera, type TrackingDiagnostics } from "../../phrase-recognition/camera";
import { drawHandLandmarks } from "../hand-overlay";
import { COLLECTION as C, PARTICIPANT_ID, SESSION_ID } from "../config";
import { PHRASE_VOCABULARY as V } from "../phrase-training/vocabulary";
import { PhraseTrainingRecorder, emptyPhraseRecording } from "../phrase-training/recorder";
import { PHRASE_COLLECTION as P, acceptPhraseReview, decodePhraseBundle, encodePhraseBundle, phraseExportBatches, phraseReceipt, validatePhraseQueue, type PhraseTrainingSample, type PhraseReceipt } from "../phrase-training/dataset";
const button = "rounded border px-4 py-2 disabled:opacity-40";
const field = "mt-1 block w-full rounded border bg-slate-900 p-2";
const failureMessage = (error: unknown) => error instanceof Error ? error.message : "Collection failed.";
export default function PhraseTrainingCollection({ onCanLeaveChange }: { onCanLeaveChange: (ready: boolean) => void }) {
  const [participant, setParticipant] = useState("");
  const [session, setSession] = useState("");
  const [label, setLabel] = useState<number | null>(null);
  const [consentAt, setConsentAt] = useState("");
  const [pilotAcknowledged, setPilotAcknowledged] = useState(false);
  const [duration, setDuration] = useState(4000), [countdown, setCountdown] = useState(3000), [target, setTarget] = useState(20);
  const [cameraState, setCameraState] = useState("off");
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });
  const [stats, setStats] = useState<TrackingDiagnostics>({ rawHands: 0, acceptedHands: 0, fps: 0, handedness: [] });
  const [state, setState] = useState(emptyPhraseRecording);
  const [samples, setSamples] = useState<PhraseTrainingSample[]>([]);
  const [archived, setArchived] = useState<PhraseReceipt[]>([]);
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());
  const [savedConfirmed, setSavedConfirmed] = useState(false);
  const [importReview, setImportReview] = useState<PhraseTrainingSample[] | null>(null);
  const [reading, setReading] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  const video = useRef<HTMLVideoElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const camera = useRef<PhraseCamera | null>(null), recorder = useRef<PhraseTrainingRecorder | null>(null);
  const mounted = useRef(false), lastUi = useRef(0), fileReading = useRef(false);
  const closing = useRef<Promise<void> | null>(null);
  const busy = state.phase === "countdown" || state.phase === "recording";
  const review = state.review;
  const batches = useMemo(() => phraseExportBatches(samples, P.batchBytes), [samples]);
  const queueBytes = useMemo(() => new TextEncoder().encode(encodePhraseBundle(samples)).byteLength, [samples]);
  const selected = V.labels.find(item => item.index === label);
  const canRecord = !reading && !importReview && cameraState === "ready" && state.phase === "idle" && Boolean(consentAt) && pilotAcknowledged && label !== null && PARTICIPANT_ID.test(participant) && SESSION_ID.test(session) && samples.length < P.maxSamples && queueBytes < P.maxBytes;

  useEffect(() => { onCanLeaveChange(cameraState === "off" && state.phase === "idle" && !samples.length && !reading && !importReview); }, [cameraState, state.phase, samples.length, reading, importReview, onCanLeaveChange]);
  useEffect(() => {
    mounted.current = true; const current = new PhraseTrainingRecorder(setState); recorder.current = current;
    return () => { mounted.current = false; current.dispose(); recorder.current = null; const owned = camera.current; camera.current = null; void owned?.dispose().catch(() => console.error("Phrase collection camera cleanup failed.")); };
  }, []);
  useEffect(() => {
    if (!samples.length && !busy && !review && !importReview && !archived.length) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [samples.length, busy, review, importReview, archived.length]);

  async function stopCamera() {
    if (closing.current) return closing.current;
    if (recorder.current?.snapshot.phase !== "review") recorder.current?.cancel();
    const owned = camera.current; camera.current = null; setCameraState("stopping");
    const operation = (async () => {
      try { await owned?.dispose(); }
      catch (cause) { if (mounted.current) setError(failureMessage(cause)); }
      finally {
        if (mounted.current) { setCameraState("off"); setStats({ rawHands: 0, acceptedHands: 0, fps: 0, handedness: [] }); drawHandLandmarks(canvas.current, []); }
        closing.current = null;
      }
    })(); closing.current = operation; return operation;
  }
  async function startCamera() {
    if (!video.current || camera.current || closing.current || !consentAt || !pilotAcknowledged || fileReading.current || importReview) return;
    setError(""); setCameraState("starting");
    const current = new PhraseCamera(video.current, (frame, timestamp, diagnostics, raw) => {
      if (!mounted.current || camera.current !== current) return;
      recorder.current?.capture(frame, timestamp); // phraseFrame already ran on RAW results, not research frames.
      drawHandLandmarks(canvas.current, raw.multiHandLandmarks ?? []);
      if (timestamp - lastUi.current >= C.uiIntervalMs) { setStats(diagnostics); lastUi.current = timestamp; }
    }, reason => { if (mounted.current && camera.current === current) { setError(reason); void stopCamera(); } });
    camera.current = current;
    try {
      await current.start();
      if (mounted.current && camera.current === current) { setDimensions({ width: video.current.videoWidth, height: video.current.videoHeight }); setCameraState("ready"); }
    } catch (cause) { if (mounted.current && camera.current === current) { setError(failureMessage(cause)); await stopCamera(); } }
  }
  function startTake() { if (canRecord) recordSelected(); }
  function recordSelected() {
    if (label === null || !video.current) return;
    try {
      setError(""); setMessage("");
      recorder.current?.start({ participantId: participant, sessionId: session, label, consentAt, pilotAcknowledged, width: video.current.videoWidth, height: video.current.videoHeight, requestedDurationMs: duration, countdownMs: countdown }, cameraState === "ready");
    } catch (cause) { setError(failureMessage(cause)); }
  }
  function accept() {
    if (!review) return;
    try {
      const sample = acceptPhraseReview(review);
      const queue = validatePhraseQueue([...samples, sample], archived); encodePhraseBundle(queue);
      setSamples(queue); setSavedConfirmed(false); recorder.current?.cancel(); setError(""); setMessage("Sample explicitly accepted into the local phrase queue.");
    } catch (cause) { setError(failureMessage(cause)); } // Review survives capacity / duplicate failures.
  }
  function download(part: PhraseTrainingSample[], index: number) {
    try {
      const json = encodePhraseBundle(part, P.batchBytes);
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `bdsl-phrase-training-${Date.now()}-part-${index + 1}.json`; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDownloaded(previous => new Set([...previous, ...part.map(sample => sample.id)])); setSavedConfirmed(false);
      setMessage("Download started. Verify the JSON was saved before removing any queued samples. No samples were cleared.");
    } catch (cause) { setError(failureMessage(cause)); }
  }
  function removeSaved() {
    if (!savedConfirmed) return;
    const saved = samples.filter(sample => downloaded.has(sample.id));
    setArchived(previous => [...previous, ...saved.map(phraseReceipt)]);
    setSamples(previous => previous.filter(sample => !downloaded.has(sample.id)));
    setDownloaded(new Set()); setSavedConfirmed(false); setMessage("Saved batch removed from memory. Progress and duplicate-screening receipts remain for this visit.");
  }
  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file || fileReading.current) return;
    fileReading.current = true; setReading(true); setError("");
    try {
      if (file.size > P.maxBytes) throw new Error("Import exceeds 20 MiB; import separate saved batches.");
      const incoming = decodePhraseBundle(await file.text());
      if (!mounted.current) return;
      const combined = validatePhraseQueue([...samples, ...incoming], archived); encodePhraseBundle(combined); setImportReview(combined);
    } catch (cause) { if (mounted.current) setError(failureMessage(cause)); }
    finally { fileReading.current = false; if (mounted.current) setReading(false); }
  }
  return <section className="mx-auto max-w-5xl space-y-5 p-6">
    <h1 className="text-3xl font-bold">Phrase Training Collection — GRU V3 pilot</h1>
    <p>Seven classes for the next model. The existing five-class inference model is unchanged. Reported V2 held-out accuracy was 1/6 (16.67%); collecting data does not train a model.</p>
    <div className="space-y-3 rounded border border-amber-700 p-4">
      <p>Only landmarks and metadata are retained locally in memory. No camera video, audio, landmarks or recordings are uploaded. Export before refresh or navigation.</p>
      <p>Vocabulary {V.version}: <strong>provisional, not expert reviewed</strong>. Establish consistent sign references with a qualified BdSL signer before a validated study. Pilot acknowledgement does not mark definitions as reviewed.</p>
      <label className="block"><input type="checkbox" checked={pilotAcknowledged} onChange={event => { setPilotAcknowledged(event.target.checked); if (!event.target.checked) void stopCamera(); }} /> I acknowledge these provisional definitions and explicitly choose pilot collection.</label>
      <label className="block"><input type="checkbox" checked={Boolean(consentAt)} onChange={event => { setConsentAt(event.target.checked ? new Date().toISOString() : ""); if (!event.target.checked) void stopCamera(); }} /> I confirm participant consent to local landmark collection under the phrase pilot protocol.</label>
      <p className="text-sm">Keep real identities and consent records separately. Reuse the same participant ID for the same person in every session. Do not commit exported landmarks to public Git history.</p>
    </div>
    <fieldset disabled={state.phase !== "idle" || reading || Boolean(importReview)} className="grid gap-4 sm:grid-cols-3">
      <label>Participant ID<input className={field} placeholder="P001" maxLength={7} value={participant} disabled={cameraState !== "off"} onChange={event => { setParticipant(event.target.value); setConsentAt(""); }} /></label>
      <label>Session ID<input className={field} placeholder="S001" maxLength={9} value={session} onChange={event => setSession(event.target.value)} /></label>
      <label>Phrase label<select aria-label="Phrase label" className={field} value={label ?? ""} onChange={event => setLabel(event.target.value === "" ? null : Number(event.target.value))}><option value="">Select the intended class explicitly</option>{V.labels.map(item => <option key={item.id} value={item.index}>{item.index}. {item.bangla} · {item.id}</option>)}</select></label>
      <label>Recording duration<select aria-label="Recording duration" className={field} value={duration} onChange={event => setDuration(Number(event.target.value))}>{[4, 6, 8].map(seconds => <option key={seconds} value={seconds * 1000}>{seconds} seconds</option>)}</select></label>
      <label>Countdown (seconds)<input className={field} type="number" min="0" max="10" step="1" value={countdown / 1000} onChange={event => setCountdown(Math.max(0, Math.min(10, Math.round(Number(event.target.value)))) * 1000)} /></label>
      <label>Target recordings per class<input className={field} type="number" min="1" max="1000" step="1" value={target} onChange={event => setTarget(Math.max(1, Math.min(1000, Math.round(Number(event.target.value)) || 20)))} /></label>
    </fieldset>
    {label === 6 && <p className="rounded border border-amber-600 p-3">Unknown is negative-gesture data, not a BdSL phrase. Deliberately record unrelated movements, stationary hands or incomplete phrases. Hand usage may vary; no-hand takes are still rejected. Never use model predictions as training labels.</p>}
    <CollectionPreview video={video} canvas={canvas} dimensions={dimensions} />
    <p role="status">Camera/detector: {cameraState}. Raw hands: {stats.rawHands}; accepted: {stats.acceptedHands}; detector FPS: {stats.fps.toFixed(1)}. {stats.handedness.map((hand, i) => `Hand ${i + 1}: ${hand.label} ${(hand.confidence * 100).toFixed(1)}%.`).join(" ")}</p>
    <div className="flex flex-wrap gap-3">
      <button className={button} disabled={!consentAt || !pilotAcknowledged || cameraState !== "off" || reading || Boolean(importReview)} onClick={() => void startCamera()}>Start camera</button>
      <button className={button} disabled={cameraState === "off" || cameraState === "stopping"} onClick={() => void stopCamera()}>Stop camera</button>
      <button className={`${button} bg-blue-700`} disabled={!canRecord} onClick={startTake}>Record sample</button>
      <button className={button} disabled={state.phase !== "recording"} onClick={() => recorder.current?.stop()}>Stop take and review</button>
      <button className={button} disabled={!busy} onClick={() => recorder.current?.cancel()}>Cancel take</button>
    </div>
    <p role="status">{state.phase === "countdown" ? `Prepare: ${Math.ceil(state.remainingMs / 1000)}` : state.phase === "recording" ? `Recording: ${(state.remainingMs / 1000).toFixed(1)} seconds remaining; ${state.frames} frames` : state.phase === "review" ? "Review this take before accepting or discarding." : "Select the intended label, confirm consent, and start the camera."}</p>
    {review && <section aria-label="Sample review" className="space-y-3 rounded border p-4">
      <h2 className="text-xl font-semibold">Sample review: {selected?.bangla} — {review.errors.length ? "rejected" : review.quality.status}</h2>
      <p>{review.quality.frameCount} frames · {review.quality.validFrames} valid · {review.quality.effectiveFps.toFixed(1)} FPS · {(review.quality.missingRatio * 100).toFixed(1)}% missing · maximum gap {review.quality.maxGapMs.toFixed(0)} ms.</p>
      <ul>{[...new Set([...review.errors, ...review.quality.reasons])].map(reason => <li key={reason}>{reason}</li>)}</ul>
      <p>Quality checks assess capture structure, not sign correctness. Accept only if the intended phrase (or deliberate negative gesture) was performed.</p>
      <div className="flex flex-wrap gap-3">
        <button className={button} disabled={Boolean(review.errors.length) || !review.sample || reading} onClick={accept}>{review.quality.status === "warning" ? "Accept with warnings" : "Accept sample"}</button>
        <button className={button} onClick={() => recorder.current?.cancel()}>Discard sample</button>
        <button className={button} disabled={cameraState !== "ready" || !consentAt || !pilotAcknowledged || reading} onClick={() => { recorder.current?.cancel(); recordSelected(); }}>Discard and re-record</button>
      </div>
    </section>}
    <section aria-label="Phrase collection progress" className="space-y-3">
      <h2 className="text-xl font-semibold">Local phrase collection: {samples.length} queued samples</h2>
      <p>Queue: {(queueBytes / 1048576).toFixed(2)} / 20 MiB; maximum 100 samples. Saved-batch progress remains in memory until leaving this mode or refreshing.</p>
      <ul className="grid gap-2 sm:grid-cols-2">{V.labels.map(item => {
        const queued = samples.filter(sample => sample.label === item.index).length, saved = archived.filter(sample => sample.label === item.index).length;
        return <li key={item.id}><span lang="bn">{item.bangla}</span>: {queued + saved}/{target} ({queued} queued, {saved} saved) <progress aria-label={`${item.id} progress`} max={target} value={Math.min(target, queued + saved)} /></li>;
      })}</ul>
      <div className="flex flex-wrap gap-3">{batches.map((part, index) => <button className={button} disabled={busy || reading || Boolean(importReview)} key={index} onClick={() => download(part, index)}>{batches.length === 1 ? "Export phrase JSON" : `Export batch ${index + 1}/${batches.length}`} ({part.length} samples)</button>)}</div>
      <label className="block"><input type="checkbox" disabled={busy || !downloaded.size || reading} checked={savedConfirmed} onChange={event => setSavedConfirmed(event.target.checked)} /> I verified that the downloaded JSON batch files were saved.</label>
      <button className={button} disabled={!savedConfirmed || !downloaded.size || busy || reading || Boolean(importReview)} onClick={removeSaved}>Remove downloaded samples from queue</button>
      <p className="text-sm">A full queue never silently clears data or the pending review. Export accepted samples, verify the files, then remove downloaded samples to continue toward all seven class targets.</p>
      <details><summary>Accepted samples — delete or re-record</summary><ul className="space-y-2">{samples.map(sample => <li key={sample.id}>{V.labels[sample.label].bangla} · {sample.participantId}/{sample.sessionId} · {sample.id} <button className={button} disabled={busy || reading || Boolean(importReview)} onClick={() => { setSamples(previous => previous.filter(item => item.id !== sample.id)); setDownloaded(previous => { const next = new Set(previous); next.delete(sample.id); return next; }); setSavedConfirmed(false); setMessage("Sample deleted locally. Previously downloaded files are unchanged. Record and explicitly accept a replacement if needed."); }}>Delete sample</button></li>)}</ul></details>
      <label className="block">Import phrase dataset JSON<input className={field} type="file" accept="application/json,.json" disabled={state.phase !== "idle" || cameraState !== "off" || reading || Boolean(importReview)} onChange={event => void readFile(event)} /></label>
      {importReview && <section aria-label="Phrase import review" className="space-y-2 rounded border p-3"><p>Validated import: {importReview.length} total queued samples after merge. Class mappings, raw/features parity and duplicate screening passed.</p><button className={button} onClick={() => { try { const checked = validatePhraseQueue(importReview, archived); encodePhraseBundle(checked); setSamples(checked); setImportReview(null); setSavedConfirmed(false); } catch (cause) { setError(failureMessage(cause)); } }}>Accept validated import</button><button className={button} onClick={() => setImportReview(null)}>Cancel import</button></section>}
    </section>
    {error && <p role="alert" className="text-amber-200">{error}</p>}
    <p role="status">{reading ? "Validating local phrase dataset…" : message}</p>
  </section>;
}
