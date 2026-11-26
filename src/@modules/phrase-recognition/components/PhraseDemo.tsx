"use client";
import { useEffect, useRef, useState } from "react";
import { PhraseCamera, type TrackingDiagnostics } from "../camera";
import { drawHandLandmarks } from "../../research/hand-overlay";
import {
  PhraseEngine,
  type PhraseLabel,
  type PhrasePrediction,
} from "../engine";
import { PHRASE, PhraseBuffer, preprocessPhrase } from "../preprocess";

const message = (error: unknown) =>
  error instanceof Error ? error.message : "An unexpected error occurred.";
const button =
  "rounded-lg bg-emerald-700 px-4 py-2 font-medium hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40";
export default function PhraseDemo() {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const fileUrl = useRef<string | null>(null);
  const [source, setSource] = useState("camera");
  const [fileName, setFileName] = useState("");
  const [playbackRate, setPlaybackRate] = useState(0.25);
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });
  const [diagnostics, setDiagnostics] = useState<TrackingDiagnostics>({ rawHands: 0, acceptedHands: 0, fps: 0, handedness: [] });
  const engine = useRef<PhraseEngine | null>(null),
    camera = useRef<PhraseCamera | null>(null);
  const buffer = useRef<PhraseBuffer | null>(null),
    mounted = useRef(false);
  const [labels, setLabels] = useState<PhraseLabel[]>([]);
  const [modelStatus, setModelStatus] = useState("Loading"),
    [cameraStatus, setCameraStatus] = useState("Stopped");
  const [recording, setRecording] = useState(false),
    [predicting, setPredicting] = useState(false);
  const [count, setCount] = useState(0),
    [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(""),
    [status, setStatus] = useState(
      "Wait for the model, then start your camera.",
    );
  const [prediction, setPrediction] = useState<PhrasePrediction | null>(null);
  const [threshold, setThreshold] = useState<number>(
    PHRASE.confidenceThreshold,
  );
  const [maxDuration, setMaxDuration] = useState<number>(
    PHRASE.maxDurationMs / 1000,
  );

  useEffect(() => {
    mounted.current = true;
    let active = true;
    const instance = new PhraseEngine();
    engine.current = instance;
    instance
      .load()
      .then((mapping) => {
        if (active) {
          setLabels(mapping);
          setModelStatus("Ready");
          setStatus(
            "Model ready. Start your camera to record a complete phrase.",
          );
        }
      })
      .catch((cause) => {
        if (active) {
          setModelStatus("Failed");
          setError(message(cause));
        }
      });
    return () => {
      active = false;
      mounted.current = false;
      buffer.current = null;
      instance.dispose();
      engine.current = null;
      const session = camera.current;
      camera.current = null;
      const url = fileUrl.current; fileUrl.current = null;
      void Promise.resolve(session?.dispose()).catch(() => undefined).finally(() => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, []);

  function finish() {
    const captured = buffer.current;
    if (!captured) return;
    buffer.current = null;
    setRecording(false);
    setPredicting(true);
    setError("");
    setCount(captured.frames.length);
    setElapsed(
      Math.min(source === "video" ? (captured.frames[captured.frames.length - 1]?.timestamp ?? captured.startedAt) - captured.startedAt : performance.now() - captured.startedAt, captured.maxDurationMs),
    );
    try {
      const values = preprocessPhrase(captured.frames);
      const result = engine.current!.predict(values, threshold);
      setPrediction(result);
      setStatus(
        result.accepted
          ? "Prediction complete. You can record another phrase."
          : "Uncertain — please try again",
      );
    } catch (cause) {
      setPrediction(null);
      setError(message(cause));
      setStatus("Recording rejected. Please try again.");
    } finally {
      setPredicting(false);
    }
  }
  // Read current options when the timer completes a recording.
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  });
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => {
      const capture = buffer.current;
      if (!capture) return;
      const duration = source === "video" ? (capture.frames[capture.frames.length - 1]?.timestamp ?? capture.startedAt) - capture.startedAt : performance.now() - capture.startedAt;
      setElapsed(Math.min(duration, capture.maxDurationMs));
      setCount(capture.frames.length);
      if (
        duration >= capture.maxDurationMs ||
        capture.frames.length >= PHRASE.maxFrames
      )
        finishRef.current();
    }, 100);
    return () => clearInterval(timer);
  }, [recording, source]);

  async function stopCamera(preserveResultStatus = false) {
    buffer.current = null;
    setRecording(false);
    if (!preserveResultStatus) setDiagnostics({ rawHands: 0, acceptedHands: 0, fps: 0, handedness: [] });
    drawHandLandmarks(canvas.current, []);
    setCameraStatus("Stopping");
    const session = camera.current;
    camera.current = null;
    try {
      await session?.dispose();
    } catch (cause) {
      if (mounted.current) setError(`Camera cleanup failed: ${message(cause)}`);
    } finally {
      if (mounted.current) {
        setCameraStatus("Stopped");
        if (!preserveResultStatus) setStatus("Source stopped. Any unfinished recording was discarded.");
      }
    }
  }
  async function startCamera() {
    if (!video.current || camera.current) return;
    if (source === "video" && !fileUrl.current) { setError("Choose a local video first."); return; }
    setError("");
    setCameraStatus("Starting");
    let lastUpdate = 0;
    const session = new PhraseCamera(
      video.current,
      (frame, timestamp, stats, results, mediaTimeMs) => {
        if (!mounted.current || camera.current !== session) return;
        const capture = buffer.current;
        if (capture && timestamp >= capture.startedAt) capture.push(mediaTimeMs === undefined ? frame : { ...frame, timestamp: capture.startedAt + mediaTimeMs });
        const element = video.current, overlay = canvas.current;
        if (element && overlay && element.videoWidth && element.videoHeight) {
          if (overlay.width !== element.videoWidth) overlay.width = element.videoWidth;
          if (overlay.height !== element.videoHeight) overlay.height = element.videoHeight;
        }
        drawHandLandmarks(overlay, results.multiHandLandmarks);
        if (timestamp - lastUpdate > 200) {
          setDiagnostics(stats);
          lastUpdate = timestamp;
        }
      },
      (reason) => {
        if (!mounted.current || camera.current !== session) return;
        setError(reason);
        void stopCamera();
      },
      undefined,
      source === "video" ? { url: fileUrl.current!, playbackRate, ended: () => {
        if (!mounted.current || camera.current !== session) return;
        const completed = Boolean(buffer.current);
        if (completed) finishRef.current();
        void stopCamera(completed);
      } } : undefined,
    );
    camera.current = session;
    try {
      await session.start();
      if (mounted.current && camera.current === session) {
        setCameraStatus("Running");
        setStatus(
          "Frame your upper body and both hands. Start recording just before signing.",
        );
      }
    } catch (cause) {
      if (mounted.current && camera.current === session) {
        setError(message(cause));
        await stopCamera();
      }
    }
  }
  function reset() {
    buffer.current = null;
    setRecording(false);
    setCount(0);
    setElapsed(0);
    setPrediction(null);
    setError("");
    setStatus("Ready for another recording.");
  }
  function startRecording() {
    if (modelStatus !== "Ready" || cameraStatus !== "Running" || buffer.current)
      return;
    reset();
    if (source === "video" && video.current) {
      video.current.currentTime = 0;
      void video.current.play().catch(cause => { if (mounted.current) { setError(message(cause)); buffer.current = null; setRecording(false); } });
    }
    buffer.current = new PhraseBuffer(performance.now(), maxDuration * 1000);
    setRecording(true);
    setStatus("Recording — sign one complete phrase, then finish.");
  }
  const busy = recording || predicting;
  return (
    <section className="container mx-auto max-w-6xl space-y-6 py-10">
      <div>
        <p className="mb-2 text-emerald-400">
          Let’s Talk · Experimental prototype
        </p>
        <h1 className="text-3xl font-semibold">
          Bangla Sign Language — Live Phrase Recognition
        </h1>
        <p className="mt-3 text-slate-300">
          Record one complete sign phrase. This five-class model was trained on
          one original video per class; live recognition accuracy has not been
          measured.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-slate-600 bg-slate-900 p-5">
          <label className="block">Input source
            <select aria-label="Input source" className="ml-3 rounded bg-slate-800 p-2" value={source} disabled={cameraStatus !== "Stopped" || busy} onChange={event => { setSource(event.target.value); reset(); }}>
              <option value="camera">Webcam</option><option value="video">Local video file</option>
            </select>
          </label>
          {source === "video" && <label className="block">Local video (processed in this browser)
            <input aria-label="Local video file" className="mt-2 block w-full" type="file" accept="video/*" disabled={cameraStatus !== "Stopped" || busy} onChange={event => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.type && !file.type.startsWith("video/")) { setError("Choose a supported video file."); return; }
              if (fileUrl.current) URL.revokeObjectURL(fileUrl.current);
              fileUrl.current = URL.createObjectURL(file); setFileName(file.name); reset();
            }} />
            {fileName && <span className="text-sm text-slate-300">{fileName}. Use an unmirrored, trimmed clip; Start Recording replays from the beginning. End of file finishes the take.</span>}
          </label>}
          {source === "video" && <label className="block">Video playback speed
            <select aria-label="Video playback speed" className="ml-3 rounded bg-slate-800 p-2" value={playbackRate} disabled={cameraStatus !== "Stopped" || busy} onChange={event => setPlaybackRate(Number(event.target.value))}>
              <option value={0.25}>0.25× (slow devices)</option><option value={0.5}>0.5×</option><option value={1}>1×</option>
            </select>
            <span className="mt-1 block text-sm text-slate-300">Recording time follows the original video timeline. Slower playback gives tracking more time per frame.</span>
          </label>}
          <div className="relative overflow-hidden rounded-lg bg-black" style={{ aspectRatio: dimensions.width / dimensions.height }}>
            <video ref={video} playsInline muted aria-label="Mirrored webcam preview" className="h-full w-full -scale-x-100 object-contain" onLoadedMetadata={() => {
              const element = video.current;
              if (element?.videoWidth && element.videoHeight) setDimensions({ width: element.videoWidth, height: element.videoHeight });
            }} />
            <canvas ref={canvas} width={dimensions.width} height={dimensions.height} aria-hidden="true" data-testid="phrase-hand-overlay" className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100" />
          </div>
          <p className="text-sm text-slate-300">
            Preview and green overlay are mirrored; MediaPipe receives unmirrored input pixels.
            Keep both hands fully visible.
          </p>
          <dl className="grid grid-cols-2 gap-3 text-sm" aria-live="polite">
            <div>
              <dt>Model</dt>
              <dd
                data-testid="phrase-model-status"
                className="text-emerald-300"
              >
                {modelStatus}
              </dd>
            </div>
            <div>
              <dt>Camera</dt>
              <dd>{cameraStatus}</dd>
            </div>
            <div>
              <dt>Raw detected hands</dt>
              <dd data-testid="phrase-raw-hands">{diagnostics.rawHands}</dd>
            </div>
            <div>
              <dt>Accepted hands (training threshold ≥80%)</dt>
              <dd data-testid="phrase-accepted-hands">{diagnostics.acceptedHands}</dd>
            </div>
            <div>
              <dt>Detector FPS (processed average)</dt>
              <dd>{diagnostics.fps.toFixed(1)}</dd>
            </div>
            <div>
              <dt>Handedness confidence</dt>
              <dd>{diagnostics.handedness.length ? diagnostics.handedness.map((hand, index) => <span className="block" key={index}>Hand {index + 1}: {hand.label} {Number.isFinite(hand.confidence) ? (hand.confidence * 100).toFixed(1) : "—"}% · {hand.accepted ? "accepted" : "unassigned / filtered"}</span>) : "No detections"}</dd>
            </div>
            <div>
              <dt>Recording</dt>
              <dd>
                {recording ? "Recording" : predicting ? "Predicting" : "Idle"}
              </dd>
            </div>
            <div>
              <dt>Timer</dt>
              <dd>
                {(elapsed / 1000).toFixed(1)} s / {maxDuration} s
              </dd>
            </div>
            <div>
              <dt>Captured frames</dt>
              <dd>{count}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-3">
            <button
              className={button}
              disabled={
                modelStatus !== "Ready" || cameraStatus !== "Stopped" || busy
              }
              onClick={() => void startCamera()}
            >
              {source === "video" ? "Start Video" : "Start Camera"}
            </button>
            <button
              className={button}
              disabled={
                !["Running", "Starting"].includes(cameraStatus) || predicting
              }
              onClick={() => void stopCamera()}
            >
              {source === "video" ? "Stop Video" : "Stop Camera"}
            </button>
            <button
              className={button}
              disabled={
                modelStatus !== "Ready" || cameraStatus !== "Running" || busy
              }
              onClick={startRecording}
            >
              Start Recording
            </button>
            <button className={button} disabled={!recording} onClick={finish}>
              Finish Recording
            </button>
            <button className={button} disabled={predicting} onClick={reset}>
              Reset
            </button>
          </div>
        </div>
        <div className="space-y-5 rounded-xl border border-slate-600 bg-slate-900 p-5">
          <p role="status" aria-live="polite">
            {status}
          </p>
          {error && (
            <p role="alert" className="rounded-lg bg-red-950 p-3 text-red-200">
              {error}
            </p>
          )}
          <div className="rounded-lg bg-slate-800 p-5" aria-live="polite">
            <h2 className="mb-3 text-lg font-semibold">Recognition result</h2>
            {prediction ? (
              <>
                <p
                  lang={prediction.accepted ? "bn" : "en"}
                  className="text-3xl leading-relaxed"
                >
                  {prediction.accepted
                    ? prediction.label.bangla
                    : "Uncertain — please try again"}
                </p>
                <p className="mt-2">
                  English meaning:{" "}
                  {prediction.accepted ? prediction.label.english : "—"}
                </p>
                <p className="mt-2">
                  Prediction confidence:{" "}
                  {(prediction.confidence * 100).toFixed(1)}%
                </p>
              </>
            ) : (
              <p>No prediction yet.</p>
            )}
          </div>
          <label className="block">
            Confidence threshold: {Math.round(threshold * 100)}%
            <input
              aria-label="Confidence threshold"
              className="mt-2 block w-full"
              type="range"
              min="0.5"
              max="1"
              step="0.01"
              value={threshold}
              disabled={busy}
              onChange={(event) => setThreshold(Number(event.target.value))}
            />
          </label>
          <label className="block">
            Maximum recording duration (seconds)
            <input
              className="ml-3 w-20 rounded border border-slate-500 bg-slate-800 p-2"
              type="number"
              min="6"
              max="30"
              value={maxDuration}
              disabled={busy}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isFinite(value))
                  setMaxDuration(Math.max(6, Math.min(30, value)));
              }}
            />
          </label>
          <p className="text-sm text-amber-200">
            Confidence is a model score, not measured recognition accuracy. The
            threshold is provisional and cannot reliably detect unknown signs.
            No predictions are sent to meetings.
          </p>
          <h2 className="text-lg font-semibold">Supported phrases</h2>
          <ul className="space-y-2">
            {labels.map((label) => (
              <li key={label.index}>
                <span lang="bn">{label.bangla}</span> — {label.english}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
