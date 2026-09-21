"use client";
import { useEffect, useRef, useState } from "react";
import type { Hands } from "@mediapipe/hands";
import type { Camera } from "@mediapipe/camera_utils";
import { StaticAlphabetEngine } from "../static-engine";
import { DEFAULT_STABILIZER_CONFIG, PredictionStabilizer } from "../stabilizer";
import { drawConnectors, drawLandmarks } from "../normalization";
import type { RecognitionFrame } from "../types";
export default function StaticSignDemo() {
  const videoRef = useRef<HTMLVideoElement>(null); const canvasRef = useRef<HTMLCanvasElement>(null);
  const [enabled, setEnabled] = useState(false); const [status, setStatus] = useState("Camera is off.");
  const [prediction, setPrediction] = useState(""); const [accepted, setAccepted] = useState("");
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false; let processing = false;
    let camera: Camera | undefined; let hands: Hands | undefined;
    let inFlight: Promise<void> = Promise.resolve();
    const video = videoRef.current;
    const engine = new StaticAlphabetEngine(); const stabilizer = new PredictionStabilizer();
    const stopTracks = () => {
      camera?.stop(); const stream = video?.srcObject;
      if (stream instanceof MediaStream) stream.getTracks().forEach(track => track.stop());
    };
    async function start() {
      try {
        await engine.load();
        if (cancelled) return;
        const [handModule, cameraModule] = await Promise.all([import("@mediapipe/hands"), import("@mediapipe/camera_utils")]);
        if (cancelled || !video) return;
        hands = new handModule.Hands({ locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}` });
        hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });
        hands.onResults(results => {
          if (cancelled || processing) return; processing = true;
          const canvas = canvasRef.current; const ctx = canvas?.getContext("2d");
          if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
            const first = results.multiHandLandmarks?.[0];
            if (first) { drawConnectors(ctx, first, handModule.HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 3 }); drawLandmarks(ctx, first, { color: "#FF0000", lineWidth: 2 }); }
          }
          const frame: RecognitionFrame = { timestamp: Date.now(), hands: (results.multiHandLandmarks ?? []).map((landmarks, index) => ({ side: results.multiHandedness?.[index]?.label === "Left" ? "left" : results.multiHandedness?.[index]?.label === "Right" ? "right" : "unknown", landmarks })) };
          void engine.predict(frame).then(result => {
            if (cancelled) return;
            setPrediction(result.state === "prediction" ? `${result.text} (${Math.round(result.confidence * 100)}%)` : "");
            setStatus(result.state === "no-hand" ? "হাত দেখান (Show hand)" : result.state !== "prediction" || result.confidence < DEFAULT_STABILIZER_CONFIG.confidenceThreshold ? "Unknown / low confidence" : "Static alphabet prediction");
            const output = stabilizer.push(result); if (output) setAccepted(output.text);
          }).catch(() => { if (!cancelled) setStatus("Prediction failed. Stop and retry."); }).finally(() => { processing = false; });
        });
        camera = new cameraModule.Camera(video, {
          onFrame: async () => {
            if (cancelled || !hands) return;
            inFlight = hands.send({ image: video });
            try { await inFlight; } catch { if (!cancelled) { stopTracks(); setStatus("Hand tracking failed. Stop and retry."); } }
          }, width: 640, height: 480,
        });
        await camera.start(); if (cancelled) stopTracks(); else setStatus("হাত দেখান (Show hand)");
      } catch (error) { stopTracks(); if (!cancelled) setStatus(error instanceof Error ? error.message : "Camera or model could not start."); }
    }
    const started = start();
    return () => {
      cancelled = true; stopTracks();
      void started.then(async () => {
        stopTracks(); await inFlight.catch(() => {}); await hands?.close().catch(() => {}); engine.dispose(); stabilizer.reset();
      });
    };
  }, [enabled]);
  return <section className="mx-auto max-w-3xl p-6"><h1 className="text-2xl font-bold">Bangla static alphabet demo</h1><p className="my-3 text-slate-300">Preserved 36-class MLP prototype. It does not recognize continuous words or sentences.</p>
    <button className="mb-4 rounded bg-emerald-700 p-3" onClick={() => { setEnabled(!enabled); setPrediction(""); setAccepted(""); setStatus(enabled ? "Camera is off." : "Loading the static alphabet model…"); }}>{enabled ? "Stop camera" : "Start camera"}</button>
    <video ref={videoRef} playsInline muted width={640} height={480} className="hidden" /><canvas ref={canvasRef} width={640} height={480} className="w-full -scale-x-100 rounded-xl bg-black" />
    <p role="status" className="mt-4">{status}</p><p lang="bn">Raw prediction: {prediction || "—"}</p><p lang="bn" className="mt-4 text-2xl">Last accepted alphabet: {accepted || "—"}</p><p className="mt-2 text-slate-400">Accepted text is stabilized locally and is not broadcast to a meeting yet.</p>
  </section>;
}
