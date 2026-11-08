import type { Hands, Results } from "@mediapipe/hands";
import { COLLECTION as C } from "./config.ts";
import { temporalFrame } from "./frame.ts";
import type { TemporalFrame } from "./types.ts";
type Detector = Pick<Hands, "initialize" | "setOptions" | "onResults" | "send" | "close">;
interface Dependencies { camera: () => Promise<MediaStream>; detector: () => Promise<Detector>; now: () => number; }
const browserDependencies: Dependencies = {
  camera: () => navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } }),
  detector: async () => { const { Hands } = await import("@mediapipe/hands"); return new Hands({ locateFile: file => `${C.assetRoot}${file}` }); },
  now: () => performance.now(),
};
/** Dedicated research camera; never touches a LiveKit track or the static classifier. */
export class ResearchCamera {
  private dependencies: Dependencies;
  private video: HTMLVideoElement;
  private frame: (frame: TemporalFrame, capturedAt: number) => void;
  private failure: (message: string) => void;
  private stream?: MediaStream;
  private detector?: Detector;
  private initialization?: Promise<void>;
  private disposal?: Promise<void>;
  private inFlight: Promise<void> = Promise.resolve();
  private timer?: ReturnType<typeof setTimeout>;
  private disposed = false;
  private latest?: Results;
  private ended = () => { this.failure("Camera stopped. Restart it before collecting another take."); void this.dispose().catch(() => this.failure("Camera cleanup failed. Reload this page before restarting.")); };
  constructor(video: HTMLVideoElement, frame: (frame: TemporalFrame, capturedAt: number) => void, failure: (message: string) => void, dependencies = browserDependencies) {
    this.video = video; this.frame = frame; this.failure = failure; this.dependencies = dependencies;
  }
  start(): Promise<void> { if (this.disposed) return Promise.reject(new Error("Camera session is closed.")); this.initialization ??= this.initialize(); return this.initialization; }
  private async initialize() {
    try {
      this.stream = await this.dependencies.camera();
      if (this.disposed) { this.stream.getTracks().forEach(track => track.stop()); return; }
      this.stream.getTracks().forEach(track => track.addEventListener("ended", this.ended));
      this.video.srcObject = this.stream;
      await this.video.play();
      if (this.disposed) return;
      this.detector = await this.dependencies.detector();
      if (this.disposed) return;
      this.detector.setOptions(C.hands);
      this.detector.onResults(results => { this.latest = results; });
      await this.detector.initialize();
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
      if (this.video.readyState >= 2) {
        this.latest = undefined;
        await this.detector.send({ image: this.video });
        if (this.disposed) return;
        const results = this.latest as Results | undefined;
        if (!results) throw new Error("Detector did not return a frame.");
        this.frame(temporalFrame(results, 0), started);
        this.latest = undefined; // Do not keep detector images between callbacks.
      }
      if (!this.disposed) this.schedule(Math.max(0, 1000 / C.targetFps - (this.dependencies.now() - started)));
    } catch {
      this.failure("Landmark capture failed. Stop the camera and restart before collecting.");
      // Defer disposal until this in-flight operation has completed.
      this.disposed = true; this.stream?.getTracks().forEach(track => track.stop());
    }
  }
  dispose(): Promise<void> {
    this.disposal ??= this.release(); return this.disposal;
  }
  private async release() {
    this.disposed = true; clearTimeout(this.timer);
    const stopTracks = () => this.stream?.getTracks().forEach(track => { track.removeEventListener("ended", this.ended); track.stop(); });
    stopTracks(); this.video.pause(); this.video.srcObject = null;
    // Initialization errors are already surfaced to start()'s caller; still release partial resources.
    await this.initialization?.catch(() => undefined);
    await this.inFlight; stopTracks();
    try { await this.detector?.close(); }
    finally { this.detector = undefined; this.stream = undefined; this.latest = undefined; }
  }
}
