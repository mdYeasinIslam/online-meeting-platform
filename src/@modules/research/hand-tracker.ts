import type { Hands, Results } from "@mediapipe/hands";
import { COLLECTION as C } from "./config.ts";

type Detector = Pick<Hands, "initialize" | "setOptions" | "onResults" | "send" | "close">;
export interface TrackingDependencies { camera: () => Promise<MediaStream>; detector: () => Promise<Detector>; now: () => number; }
const browserDependencies: TrackingDependencies = {
  camera: () => navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } }),
  detector: async () => { const { Hands } = await import("@mediapipe/hands"); return new Hands({ locateFile: file => `${C.assetRoot}${file}` }); },
  now: () => performance.now(),
};
export interface VideoSource { url: string; ended: () => void; playbackRate?: number; }
/** Shared research/phrase detector loop. Inputs are always unmirrored. */
export class HandTrackingSession {
  private dependencies: TrackingDependencies;
  private video: HTMLVideoElement;
  private frame: (frame: Results, capturedAt: number, mediaTimeMs?: number) => void;
  private failure: (message: string) => void;
  private stream?: MediaStream;
  private source?: VideoSource;
  private lastVideoTime = -1;
  private sourceEnded = () => { if (!this.disposed) this.source?.ended(); };
  private detector?: Detector;
  private initialization?: Promise<void>;
  private disposal?: Promise<void>;
  private inFlight: Promise<void> = Promise.resolve();
  private timer?: ReturnType<typeof setTimeout>;
  private disposed = false;
  private latest?: Results;
  private ended = () => { this.failure("Camera stopped. Restart it before collecting another take."); void this.dispose().catch(() => this.failure("Camera cleanup failed. Reload this page before restarting.")); };
  constructor(video: HTMLVideoElement, frame: (frame: Results, capturedAt: number, mediaTimeMs?: number) => void, failure: (message: string) => void, dependencies = browserDependencies, privateSource?: VideoSource) {
    this.video = video; this.frame = frame; this.failure = failure; this.dependencies = dependencies; this.source = privateSource;
  }
  start(): Promise<void> { if (this.disposed) return Promise.reject(new Error("Camera session is closed.")); this.initialization ??= this.initialize(); return this.initialization; }
  private async initialize() {
    try {
      if (this.source) {
        this.video.srcObject = null;
        this.video.src = this.source.url;
        this.video.playbackRate = this.source.playbackRate ?? 1;
        this.video.addEventListener("ended", this.sourceEnded);
      } else {
      this.stream = await this.dependencies.camera();
      if (this.disposed) { this.stream.getTracks().forEach(track => track.stop()); return; }
      this.stream.getTracks().forEach(track => track.addEventListener("ended", this.ended));
      this.video.srcObject = this.stream;
      }
      // Initialize the detector before playback so local clips do not run away
      // while WASM/model assets are still loading.
      if (!this.source) await this.video.play();
      if (this.disposed) return;
      this.detector = await this.dependencies.detector();
      if (this.disposed) return;
      this.detector.setOptions(C.hands);
      this.detector.onResults(results => { this.latest = results; });
      await this.detector.initialize();
      if (!this.disposed && this.source) {
        await this.video.play();
        this.video.pause();
        // The first send can lazily initialize the graph. Hold the clip still
        // until it finishes so short files cannot end before any capture.
        await this.detector.send({ image: this.video });
        this.latest = undefined;
        if (!this.disposed) { this.video.currentTime = 0; await this.video.play(); }
      }
      if (!this.disposed) this.schedule(0);
    } catch (error) {
      this.stream?.getTracks().forEach(track => track.stop());
      this.video.srcObject = null;
      throw error;
    }
  }
  private schedule(delay: number) { this.timer = setTimeout(() => { this.inFlight = this.tick(); }, delay); }
  private async tick() {
    if (this.disposed || !this.detector) return;
    const started = this.dependencies.now();
    try {
      if (this.video.readyState >= 2 && (!this.source || (!this.video.paused && !this.video.seeking && this.video.currentTime !== this.lastVideoTime))) {
        const mediaTimeMs = this.source ? this.video.currentTime * 1000 : undefined;
        if (this.source) this.lastVideoTime = this.video.currentTime;
        this.latest = undefined;
        await this.detector.send({ image: this.video });
        if (this.disposed) return;
        const results = this.latest as Results | undefined;
        if (!results) throw new Error("Detector did not return a frame.");
        this.frame({ ...results, multiHandLandmarks: results.multiHandLandmarks ?? [], multiHandedness: results.multiHandedness ?? [] }, started, mediaTimeMs);
        this.latest = undefined; // Do not keep detector images between callbacks.
      }
      if (!this.disposed) this.schedule(Math.max(0, 1000 / C.targetFps - (this.dependencies.now() - started)));
    } catch (error) {
      this.failure(`Landmark capture failed: ${error instanceof Error ? error.message : "unknown detector error"}. Restart the source before collecting.`);
      // Defer disposal until this in-flight operation has completed.
      this.disposed = true; this.stream?.getTracks().forEach(track => track.stop());
      void this.dispose().catch(() => this.failure("Hand detector cleanup failed."));
    }
  }
  dispose(): Promise<void> {
    this.disposal ??= this.release(); return this.disposal;
  }
  private async release() {
    this.disposed = true; clearTimeout(this.timer);
    const stopTracks = () => this.stream?.getTracks().forEach(track => { track.removeEventListener("ended", this.ended); track.stop(); });
    stopTracks(); this.video.pause(); this.video.srcObject = null;
    if (this.source) { this.video.removeEventListener("ended", this.sourceEnded); this.video.removeAttribute("src"); this.video.load(); }
    // Initialization errors are already surfaced to start()'s caller; still release partial resources.
    await this.initialization?.catch(() => undefined);
    await this.inFlight; stopTracks();
    try { await this.detector?.close(); }
    finally { this.detector = undefined; this.stream = undefined; this.latest = undefined; }
  }
}
