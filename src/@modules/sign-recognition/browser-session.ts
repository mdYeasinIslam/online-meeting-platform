import type { Hands, Results } from "@mediapipe/hands";
import type { LocalVideoTrack } from "livekit-client";
import { RECOGNITION_CONFIG, type RecognitionStatus } from "./config.ts";
import { StaticAlphabetEngine } from "./static-engine.ts";
import { ModelAssetMissingError } from "./model-loader.ts";
import { PredictionStabilizer } from "./stabilizer.ts";
import type { AcceptedTextListener, SignRecognitionEngine } from "./types";

type HandTracker = Pick<Hands, "initialize" | "setOptions" | "onResults" | "send" | "close">;
async function createHands(): Promise<HandTracker> {
  const handModule = await import("@mediapipe/hands");
  return new handModule.Hands({ locateFile: file => `${RECOGNITION_CONFIG.mediaPipeAssetRoot}${file}` });
}

/** Owns inference resources only. Never creates, clones, stops or mutes a meeting camera track. */
export class BrowserSignSession {
  private engine: SignRecognitionEngine;
  private hands?: HandTracker;
  private createHands: () => Promise<HandTracker>;
  private loadPromise?: Promise<void>;
  private queue: Promise<void> = Promise.resolve();
  private inFlight: Promise<void> = Promise.resolve();
  private generation = 0;
  private disposed = false;
  private disposal?: Promise<void>;
  private running = false;
  private timer?: ReturnType<typeof setTimeout>;
  private video?: HTMLVideoElement;
  private track?: LocalVideoTrack;
  private latestResults?: Results;
  private stabilizer = new PredictionStabilizer(RECOGNITION_CONFIG.stabilizer);
  private acceptedLabel = "";
  private lastUiUpdate = 0;
  private lastPhase?: RecognitionStatus["phase"];
  private frameCount = 0;
  private startedAt = 0;
  private status: (status: RecognitionStatus) => void;
  private accept: AcceptedTextListener;
  constructor(status: (status: RecognitionStatus) => void, accept: AcceptedTextListener, engine: SignRecognitionEngine = new StaticAlphabetEngine(), trackerFactory: () => Promise<HandTracker> = createHands) {
    this.status = status; this.accept = accept; this.engine = engine; this.createHands = trackerFactory;
  }
  private async load() {
    if (this.running) this.status({ phase: "loading-mediapipe" });
    this.hands = await this.createHands();
    if (this.disposed) return;
    this.hands.setOptions(RECOGNITION_CONFIG.hands);
    this.hands.onResults(results => { this.latestResults = results; });
    await this.hands.initialize();
    if (this.disposed) return;
    if (this.running) this.status({ phase: "loading-model" });
    await this.engine.load();
  }
  private detach() {
    if (this.video) {
      this.video.pause(); this.track?.detach(this.video); this.video.srcObject = null; this.video.remove();
    }
    this.video = undefined; this.track = undefined;
  }
  stop(phase: "stopped" | "paused" = "stopped") {
    this.running = false;
    this.generation++;
    clearTimeout(this.timer);
    this.detach(); this.stabilizer.reset(); this.acceptedLabel = "";
    if (!this.disposed) this.status({ phase });
  }
  start(track: LocalVideoTrack) {
    this.stop();
    this.running = true;
    const generation = this.generation;
    const active = () => !this.disposed && generation === this.generation;
    this.queue = this.queue.then(async () => {
      await this.inFlight;
      if (!active()) return;
      try {
        this.loadPromise ??= this.load();
        await this.loadPromise;
        if (!active()) return;
        const video = document.createElement("video");
        video.muted = true; video.playsInline = true; video.autoplay = true;
        video.width = 640; video.height = 480;
        // Detached off-DOM element: the SDK attaches the same camera stream, with no getUserMedia.
        this.video = video; this.track = track; track.attach(video);
        await video.play();
        if (!active()) return;
        this.frameCount = 0; this.startedAt = performance.now(); this.lastPhase = undefined;
        this.status({ phase: "ready" });
        this.schedule(generation, 0);
      } catch (error) {
        this.loadPromise = undefined;
        if (active()) this.status({ phase: error instanceof ModelAssetMissingError ? "asset-missing" : "initialization-error" });
        this.detach();
        // A failed partially initialized tracker must not survive Retry.
        if (this.hands) { await this.hands.close(); this.hands = undefined; }
      }
    }).catch(() => { if (!this.disposed) this.status({ phase: "initialization-error" }); });
  }
  private schedule(generation: number, delay: number) {
    this.timer = setTimeout(() => {
      this.inFlight = this.tick(generation);
    }, delay);
  }
  private async tick(generation: number) {
    const active = () => !this.disposed && generation === this.generation;
    const video = this.video;
    if (!active() || !video || !this.hands) return;
    if (!this.track || this.track.isMuted || this.track.mediaStreamTrack.readyState !== "live") { this.stop("paused"); return; }
    const started = performance.now();
    try {
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) { this.schedule(generation, 1000 / RECOGNITION_CONFIG.targetFps); return; }
      this.latestResults = undefined;
      await this.hands.send({ image: video });
      if (!active()) return;
      const results = this.latestResults as Results | undefined;
      if (!results) throw new Error("Hand tracker returned no result");
      const prediction = await this.engine.predict({ timestamp: Date.now(), hands: (results.multiHandLandmarks ?? []).map((landmarks, index) => ({ landmarks, side: results.multiHandedness?.[index]?.label === "Left" ? "left" : results.multiHandedness?.[index]?.label === "Right" ? "right" : "unknown" })) });
      if (!active()) return;
      const accepted = this.stabilizer.push(prediction);
      if (accepted) { this.acceptedLabel = accepted.text; this.accept(accepted); }
      this.frameCount++;
      const phase = prediction.state === "no-hand" ? "no-hand" : prediction.state !== "prediction" || prediction.confidence < RECOGNITION_CONFIG.stabilizer.confidenceThreshold ? "unknown" : "recognizing";
      const now = performance.now();
      if (accepted || phase !== this.lastPhase || now - this.lastUiUpdate >= RECOGNITION_CONFIG.uiUpdateIntervalMs) {
        this.status({ phase, rawLabel: prediction.state === "prediction" ? prediction.text : undefined, confidence: prediction.state === "prediction" ? prediction.confidence : undefined, acceptedLabel: this.acceptedLabel, inferenceMs: now - started, effectiveFps: this.frameCount * 1000 / (now - this.startedAt) });
        this.lastUiUpdate = now; this.lastPhase = phase;
      }
      if (active()) this.schedule(generation, Math.max(0, 1000 / RECOGNITION_CONFIG.targetFps - (performance.now() - started)));
    } catch {
      if (active()) { this.stop(); this.status({ phase: "inference-error" }); }
    }
  }
  dispose(): Promise<void> {
    this.disposal ??= this.release();
    return this.disposal;
  }
  private async release() {
    this.disposed = true; this.stop();
    await this.queue; await this.inFlight;
    try { await this.hands?.close(); }
    finally { this.engine.dispose(); this.hands = undefined; }
  }
}
