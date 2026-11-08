"use client";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import defaultManifest from "@/dataset/manifests/vocabulary.json";
import { COLLECTION as C, PARTICIPANT_ID, SESSION_ID } from "../config";
import { validateVocabulary } from "../vocabulary";
import { validateSample } from "../sample";
import { decodeBundle, encodeBundle, validateDataset } from "../dataset";
import { TemporalRecorder, type RecordingState } from "../recorder";
import { ResearchCamera } from "../camera";
import type { TemporalSample } from "../types";
const button = "rounded border px-4 py-2 disabled:opacity-40";
const field = "mt-1 block w-full rounded border p-2";

export default function DataCollection() {
  const [vocabulary, setVocabulary] = useState(() => validateVocabulary(defaultManifest));
  const [participant, setParticipant] = useState("");
  const [session, setSession] = useState("");
  const [labelId, setLabelId] = useState("");
  const [consentAt, setConsentAt] = useState("");
  const [loadingFile, setLoadingFile] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });
  const fileReading = useRef(false);
  const [cameraState, setCameraState] = useState<"off" | "starting" | "ready" | "stopping">("off");
  const [hands, setHands] = useState({ detected: 0, unassigned: 0 });
  const [state, setState] = useState<RecordingState>({ phase: "idle", remainingMs: 0, frames: 0, sample: null });
  const [samples, setSamples] = useState<TemporalSample[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [importReview, setImportReview] = useState<ReturnType<typeof validateDataset> | null>(null);
  const video = useRef<HTMLVideoElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const camera = useRef<ResearchCamera | null>(null), recorder = useRef<TemporalRecorder | null>(null);
  const closing = useRef<Promise<void> | null>(null);
  const mounted = useRef(false), lastUi = useRef(0);
  const takes = useRef(new Map<string, number>());
  const activeLabel = vocabulary.labels.find(label => label.id === labelId && label.active && label.reviewStatus === "reviewed");
  const busy = state.phase === "countdown" || state.phase === "recording";
  const canRecord = !loadingFile && cameraState === "ready" && Boolean(consentAt && activeLabel) && PARTICIPANT_ID.test(participant) && SESSION_ID.test(session) && state.phase === "idle" && !importReview && samples.length < C.maxLocalSamples;
  const review = useMemo(() => {
    if (!state.sample) return null;
    const check = validateSample(state.sample, vocabulary);
    if (!check.sample || check.errors.length) return check;
    const checked = validateDataset([...samples, check.sample], vocabulary);
    const rejected = checked.rejected.find(item => item.index === samples.length);
    if (rejected) return { ...check, errors: rejected.reasons };
    const sample = checked.samples.at(-1)!;
    return { sample, quality: sample.quality, errors: [] };
  }, [state.sample, vocabulary, samples]);

  useEffect(() => {
    mounted.current = true;
    const current = new TemporalRecorder(setState); recorder.current = current;
    return () => {
      mounted.current = false; current.dispose(); recorder.current = null;
      const owned = camera.current; camera.current = null;
      void owned?.dispose().catch(() => console.error("Research camera cleanup failed."));
    };
  }, []);
  useEffect(() => {
    if (!samples.length && !busy && !state.sample) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [samples.length, busy, state.sample]);

  async function stopCamera() {
    if (closing.current) return closing.current;
    if (recorder.current?.snapshot.phase !== "review") recorder.current?.cancel();
    const owned = camera.current; camera.current = null;
    setCameraState("stopping");
    const operation = (async () => {
      try { await owned?.dispose(); }
      catch { if (mounted.current) setError("Could not completely release the detector. Reload before restarting."); }
      finally {
        if (mounted.current) { setCameraState("off"); setHands({ detected: 0, unassigned: 0 }); canvas.current?.getContext("2d")?.clearRect(0, 0, 640, 480); }
        closing.current = null;
      }
    })();
    closing.current = operation;
    return operation;
  }
  async function startCamera() {
    if (camera.current || closing.current || !consentAt || fileReading.current || !video.current) return;
    setError(""); setCameraState("starting");
    const current = new ResearchCamera(video.current, (frame, capturedAt) => {
      recorder.current?.capture(frame, capturedAt);
      const now = performance.now();
      if (now - lastUi.current < C.uiIntervalMs) return;
      lastUi.current = now;
      setHands({ detected: Number(Boolean(frame.left)) + Number(Boolean(frame.right)) + frame.unassigned.length, unassigned: frame.unassigned.length });
      const ctx = canvas.current?.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, 640, 480);
        for (const hand of [frame.left, frame.right, ...frame.unassigned]) if (hand) for (const point of hand.landmarks) {
          if (![point.x, point.y].every(Number.isFinite)) continue;
          ctx.beginPath(); ctx.arc(point.x * ctx.canvas.width, point.y * ctx.canvas.height, 3, 0, Math.PI * 2); ctx.fillStyle = "#34d399"; ctx.fill();
        }
      }
    }, message => { if (mounted.current) { setError(message); void stopCamera(); } });
    camera.current = current;
    try {
      await current.start();
      if (mounted.current && camera.current === current) { setDimensions({ width: video.current!.videoWidth, height: video.current!.videoHeight }); setCameraState("ready"); }
    } catch {
      if (mounted.current && camera.current === current) { setError("Camera or hand detector could not start. Allow camera access and check detector asset connectivity."); await stopCamera(); }
    }
  }
  function startTake() {
    if (!canRecord || !activeLabel || !video.current) return;
    setError(""); setMessage("");
    const key = `${participant}/${session}/${labelId}`;
    const importedTake = Math.max(0, ...samples.filter(s => s.participantId === participant && s.sessionId === session && s.labelId === labelId).map(s => s.take));
    const take = Math.max(takes.current.get(key) ?? 0, importedTake) + 1;
    try {
      recorder.current?.start({ participantId: participant, sessionId: session, label: activeLabel, vocabularyVersion: vocabulary.version, take, consentAt, width: video.current.videoWidth, height: video.current.videoHeight }, cameraState === "ready");
      takes.current.set(key, take);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Cannot start recording."); }
  }
  function accept() {
    if (!review?.sample || review.errors.length) return;
    const checked = validateDataset([...samples, review.sample], vocabulary);
    try {
      if (checked.rejected.length) throw new Error(checked.rejected.flatMap(r => r.reasons).join(" "));
      encodeBundle(checked.samples, vocabulary); // Bound memory/export size before accepting.
      setSamples(checked.samples); recorder.current?.cancel(); setMessage("Sample accepted into the local memory queue.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to accept sample."); }
  }
  async function readFile(event: ChangeEvent<HTMLInputElement>, kind: "vocabulary" | "samples") {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file || fileReading.current) return;
    fileReading.current = true; setLoadingFile(true);
    setError(""); setMessage("");
    try {
      if (file.size > (kind === "vocabulary" ? 65536 : C.maxFileBytes)) throw new Error("File exceeds import size limit.");
      const source = await file.text();
      if (!mounted.current) return;
      if (kind === "vocabulary") {
        const manifest = validateVocabulary(JSON.parse(source));
        setVocabulary(manifest); setLabelId(""); setMessage("Vocabulary loaded locally. Review status is a researcher's assertion, not automated approval.");
      } else {
        const values = decodeBundle(source);
        if (values.length + samples.length > C.maxLocalSamples) throw new Error("Local queue limit is 100 samples. Export and clear before importing more.");
        setImportReview(validateDataset([...samples, ...values], vocabulary));
      }
    } catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : "Invalid import."); }
    finally { fileReading.current = false; if (mounted.current) setLoadingFile(false); }
  }
  function download() {
    try {
      const json = encodeBundle(samples, vocabulary);
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `bdsl-landmarks-${Date.now()}.json`; anchor.click(); URL.revokeObjectURL(url);
      setMessage("JSON exported. Store it privately outside public Git history.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Export failed."); }
  }

  return <section className="mx-auto max-w-5xl space-y-5 p-6">
    <h1 className="text-3xl font-bold">Temporal landmark collection</h1>
    <p>Day-4 research tool. This protocol and vocabulary require human review; they are not ethics-board or BdSL-expert approvals.</p>
    <div className="rounded border border-amber-700 p-4 space-y-2">
      <p>Only hand landmarks, timestamps and collection metadata are retained. No audio or raw camera video is recorded. Landmarks stay in this browser until you download JSON. Detector assets are downloaded; research samples are never uploaded.</p>
      <p>Use pseudonymous IDs such as P001 and S001. Never enter real names or emails. Participants may stop at any time. Keep identity/consent records separately under your institution's policy. Do not commit research samples to a public repository.</p>
      <p>The queue is memory-only (100 samples / 20 MiB maximum). Export before navigating away or refreshing; pending data will be lost.</p>
      <label className="flex items-start gap-2"><input type="checkbox" checked={Boolean(consentAt)} onChange={event => { setConsentAt(event.target.checked ? new Date().toISOString() : ""); if (!event.target.checked) void stopCamera(); }} />I confirm that this participant has consented to local landmark collection under the reviewed research protocol.</label>
    </div>
    <section aria-label="Vocabulary review" className="rounded border p-4 space-y-2">
      <h2 className="text-xl font-semibold">Vocabulary: {vocabulary.version}</h2>
      <p>{vocabulary.labels.filter(l => l.active).length} active labels. The default 12 candidates are provisional and inactive. Have a researcher, supervisor or qualified BdSL signer review sign references, sign type and hand usage before activating a label.</p>
      <label className="block">Load reviewed vocabulary JSON<input type="file" accept="application/json,.json" disabled={loadingFile || samples.length > 0 || state.phase !== "idle" || cameraState !== "off" || Boolean(importReview)} className={field} onChange={event => void readFile(event, "vocabulary")} /></label>
    </section>
    <fieldset disabled={loadingFile || state.phase !== "idle" || Boolean(importReview)} className="grid gap-4 sm:grid-cols-3">
      <label>Participant ID<input className={field} placeholder="P001" value={participant} maxLength={7} onChange={event => setParticipant(event.target.value)} aria-describedby="id-help" /></label>
      <label>Session ID<input className={field} placeholder="S001" value={session} maxLength={9} onChange={event => setSession(event.target.value)} aria-describedby="id-help" /></label>
      <label>Reviewed vocabulary label<select className={`${field} bg-slate-900`} value={labelId} onChange={event => setLabelId(event.target.value)}><option value="">Select an active reviewed label</option>{vocabulary.labels.map(label => <option key={label.id} value={label.id} disabled={!label.active}>{label.bangla} · {label.id}{!label.active ? " (inactive)" : ""}</option>)}</select></label>
    </fieldset>
    <p id="id-help" className="text-sm">Participant: P followed by 3–6 digits. Session: S followed by 3–8 digits. Reuse the same participant ID across every session to prevent signer leakage.</p>
    <div className="relative max-w-xl overflow-hidden rounded bg-black" style={{ aspectRatio: dimensions.width / dimensions.height }}>
      <video ref={video} muted playsInline className="h-full w-full -scale-x-100 object-contain" aria-label="Research camera preview" />
      <canvas ref={canvas} width={dimensions.width} height={dimensions.height} className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100" aria-hidden="true" />
    </div>
    <p role="status">Camera/detector: {cameraState}. Hands detected: {hands.detected}; unassigned: {hands.unassigned}.</p>
    <div className="flex flex-wrap gap-3">
      <button className={button} disabled={loadingFile || !consentAt || cameraState !== "off"} onClick={() => void startCamera()}>Start camera</button>
      <button className={button} disabled={cameraState === "off" || cameraState === "stopping"} onClick={() => void stopCamera()}>Stop camera</button>
      <button className={`${button} bg-blue-700`} disabled={!canRecord} onClick={startTake}>Record sample</button>
      <button className={button} disabled={state.phase !== "recording"} onClick={() => recorder.current?.stop()}>Stop take and review</button>
      <button className={button} disabled={!busy} onClick={() => { recorder.current?.cancel(); setMessage("Take cancelled; no sample retained. Camera preview remains on until Stop camera."); }}>Cancel take</button>
    </div>
    <p role="status">{state.phase === "countdown" ? `Prepare: ${Math.ceil(state.remainingMs / 1000)}` : state.phase === "recording" ? `Recording: ${(state.remainingMs / 1000).toFixed(1)} seconds remaining; ${state.frames} frames` : state.phase === "review" ? "Review the take below." : "Ready for a new take once consent, IDs, label and camera are ready."}</p>
    {review && <section aria-label="Sample review" className="rounded border p-4 space-y-3">
      <h2 className="text-xl font-semibold">Sample review: {review.errors.length ? "rejected" : review.quality?.status}</h2>
      {review.quality && <p>{review.quality.frameCount} frames · {(review.quality.durationMs / 1000).toFixed(2)} s · {review.quality.effectiveFps.toFixed(1)} observed FPS · {(review.quality.missingRatio * 100).toFixed(1)}% missing/unassigned frames</p>}
      <ul className="list-inside list-disc">{[...new Set([...review.errors, ...(review.quality?.reasons ?? [])])].map(reason => <li key={reason}>{reason}</li>)}</ul>
      <p>These checks assess recording structure, not whether the intended sign was performed correctly.</p>
      <div className="flex gap-3"><button className={button} disabled={review.errors.length > 0} onClick={accept}>{review.quality?.status === "warning" ? "Accept with warnings" : "Accept sample"}</button><button className={button} onClick={() => recorder.current?.cancel()}>Discard sample</button></div>
    </section>}
    <section aria-label="Local collection" className="space-y-3">
      <h2 className="text-xl font-semibold">Local collection: {samples.length} samples</h2>
      <ul className="grid gap-1 sm:grid-cols-3">{vocabulary.labels.map(label => <li key={label.id}>{label.bangla}: {samples.filter(s => s.labelId === label.id).length}</li>)}</ul>
      <div className="flex flex-wrap gap-3"><button className={button} disabled={loadingFile || !samples.length || busy} onClick={download}>Export JSON</button><button className={button} disabled={loadingFile || !samples.length || busy} onClick={() => { if (window.confirm("Clear all local accepted samples? Export them first. This cannot be undone.")) { setSamples([]); setImportReview(null); setMessage("Local accepted samples cleared."); } }}>Clear local samples</button></div>
      <label className="block">Import sample bundle<input type="file" accept="application/json,.json" disabled={loadingFile || state.phase !== "idle" || Boolean(importReview)} className={field} onChange={event => void readFile(event, "samples")} /></label>
      {importReview && <div className="rounded border p-3 space-y-2"><p>Import review: {importReview.samples.length} usable, {importReview.warnings.length} with warnings, {importReview.rejected.length} rejected (includes existing queue).</p><ul>{importReview.rejected.map((item, i) => <li key={i}>Sample {item.index + 1}: {item.reasons.join(" ")}</li>)}{importReview.warnings.map(item => <li key={item.id}>{item.reasons.join(" ")}</li>)}</ul><button className={button} disabled={importReview.rejected.length > 0} onClick={() => { try { encodeBundle(importReview.samples, vocabulary); setSamples(importReview.samples); setImportReview(null); } catch (failure) { setError(failure instanceof Error ? failure.message : "Import failed."); } }}>Accept validated import{importReview.warnings.length ? " with warnings" : ""}</button><button className={button} onClick={() => setImportReview(null)}>Cancel import</button></div>}
    </section>
    {error && <p role="alert" className="text-amber-200">{error}</p>}
    <p role="status">{loadingFile ? "Validating local file…" : message}</p>
  </section>;
}
