import { recordingClock, type RecordingClock } from "../recorder.ts";
import { PhraseBuffer, type PhraseFrame } from "../../phrase-recognition/preprocess.ts";
import { reviewPhraseCapture, validatePhraseMetadata, type PhraseMetadata, type PhraseReview } from "./dataset.ts";
export interface PhraseRecordingState { phase: "idle" | "countdown" | "recording" | "review"; remainingMs: number; frames: number; review: PhraseReview | null; }
export const emptyPhraseRecording = (): PhraseRecordingState => ({ phase: "idle", remainingMs: 0, frames: 0, review: null });
/** Explicit capture/review only: never accepts samples, trains, or calls a model. */
export class PhraseTrainingRecorder {
  private state = emptyPhraseRecording();
  private metadata?: PhraseMetadata;
  private buffer?: PhraseBuffer;
  private started = 0;
  private capturedAt = "";
  private deadline = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private disposed = false;
  private emit: (state: PhraseRecordingState) => void;
  private clock: RecordingClock;
  constructor(emit: (state: PhraseRecordingState) => void, clock = recordingClock) { this.emit = emit; this.clock = clock; }
  get snapshot() { return this.state; }
  start(metadata: PhraseMetadata, ready: boolean) {
    if (this.disposed || this.state.phase !== "idle") throw new Error("Accept or discard the current take before recording again.");
    if (!ready) throw new Error("Start the camera and wait for the detector.");
    validatePhraseMetadata(metadata, this.clock.date()); this.metadata = structuredClone(metadata);
    this.deadline = this.clock.now() + metadata.countdownMs;
    this.state = { phase: "countdown", remainingMs: metadata.countdownMs, frames: 0, review: null };
    if (metadata.countdownMs === 0) this.begin();
    this.emit(this.state); this.timer = this.clock.schedule(() => this.tick());
  }
  private begin() {
    this.started = this.clock.now(); this.capturedAt = new Date(this.clock.date()).toISOString();
    this.buffer = new PhraseBuffer(0, this.metadata!.requestedDurationMs);
    this.deadline = this.started + this.metadata!.requestedDurationMs;
    this.state = { ...this.state, phase: "recording", remainingMs: this.metadata!.requestedDurationMs };
  }
  private tick() {
    if (this.disposed) return;
    const now = this.clock.now();
    if (this.state.phase === "countdown" && now >= this.deadline) this.begin();
    if (this.state.phase === "recording" && now >= this.deadline) { this.stop("duration"); return; }
    if (!["countdown", "recording"].includes(this.state.phase)) return;
    this.state = { ...this.state, remainingMs: Math.max(0, this.deadline - this.clock.now()), frames: this.buffer?.frames.length ?? 0 };
    this.emit(this.state); this.timer = this.clock.schedule(() => this.tick());
  }
  capture(frame: PhraseFrame, capturedAt: number) {
    if (this.state.phase !== "recording") return;
    this.buffer?.push({ ...frame, timestamp: capturedAt - this.started });
  }
  stop(stoppedBy: "manual" | "duration" = "manual") {
    if (this.state.phase === "countdown") { this.cancel(); return; }
    if (this.state.phase !== "recording" || !this.metadata || !this.buffer) return;
    if (this.timer !== undefined) this.clock.cancel(this.timer); this.timer = undefined;
    const duration = Math.max(0, Math.min(this.clock.now() - this.started, this.metadata.requestedDurationMs));
    const review = reviewPhraseCapture(this.metadata, this.clock.id(), this.capturedAt, duration, stoppedBy, this.buffer.frames);
    this.buffer = undefined; this.metadata = undefined;
    this.state = { phase: "review", remainingMs: 0, frames: review.quality.frameCount, review }; this.emit(this.state);
  }
  cancel() {
    if (this.timer !== undefined) this.clock.cancel(this.timer);
    this.timer = undefined; this.buffer = undefined; this.metadata = undefined; this.state = emptyPhraseRecording();
    if (!this.disposed) this.emit(this.state);
  }
  dispose() { this.disposed = true; this.cancel(); }
}
