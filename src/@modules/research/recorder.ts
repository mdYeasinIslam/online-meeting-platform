import { COLLECTION as C, PARTICIPANT_ID, SESSION_ID } from "./config.ts";
import { assessQuality } from "./sample.ts";
import type { TemporalFrame, TemporalSample, VocabularyLabel } from "./types.ts";
export interface CaptureMetadata {
  participantId: string; sessionId: string; take: number; vocabularyVersion: string;
  label: VocabularyLabel; consentAt: string; width: number; height: number;
}
export type RecordingState = { phase: "idle" | "countdown" | "recording" | "review"; remainingMs: number; frames: number; sample: TemporalSample | null };
interface Clock { now: () => number; date: () => number; id: () => string; schedule: (fn: () => void) => ReturnType<typeof setTimeout>; cancel: (id: ReturnType<typeof setTimeout>) => void; }
const defaultClock: Clock = { now: () => performance.now(), date: () => Date.now(), id: () => crypto.randomUUID(), schedule: fn => setTimeout(fn, C.recorderTickMs), cancel: id => clearTimeout(id) };
export class TemporalRecorder {
  private state: RecordingState = { phase: "idle", remainingMs: 0, frames: 0, sample: null };
  private metadata?: CaptureMetadata;
  private frames: TemporalFrame[] = [];
  private deadline = 0;
  private started = 0;
  private wallStarted = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private disposed = false;
  private emit: (state: RecordingState) => void;
  private clock: Clock;
  constructor(emit: (state: RecordingState) => void, clock: Clock = defaultClock) { this.emit = emit; this.clock = clock; }
  get snapshot() { return this.state; }
  start(metadata: CaptureMetadata, ready: boolean) {
    if (this.disposed || this.state.phase !== "idle") throw new Error("Finish or discard the current take first.");
    if (!ready || !PARTICIPANT_ID.test(metadata.participantId) || !SESSION_ID.test(metadata.sessionId) || !Number.isFinite(Date.parse(metadata.consentAt)) || Date.parse(metadata.consentAt) > this.clock.date() || !metadata.label.active || metadata.label.reviewStatus !== "reviewed") throw new Error("Consent, valid participant/session IDs, a reviewed active label and a ready camera/detector are required.");
    this.metadata = structuredClone(metadata); this.frames = [];
    this.deadline = this.clock.now() + C.countdownMs;
    this.state = { phase: "countdown", remainingMs: C.countdownMs, frames: 0, sample: null };
    this.emit(this.state); this.timer = this.clock.schedule(() => this.tick());
  }
  private tick() {
    if (this.disposed) return;
    const now = this.clock.now();
    if (this.state.phase === "countdown" && now >= this.deadline) {
      this.started = now; this.wallStarted = this.clock.date(); this.deadline = now + C.durationMs;
      this.state = { ...this.state, phase: "recording" };
    }
    if (this.state.phase === "recording" && now >= this.deadline) { this.stop("duration"); return; }
    if (this.state.phase !== "countdown" && this.state.phase !== "recording") return;
    this.state = { ...this.state, remainingMs: Math.max(0, this.deadline - now), frames: this.frames.length };
    this.emit(this.state); this.timer = this.clock.schedule(() => this.tick());
  }
  capture(frame: TemporalFrame, capturedAt: number) {
    const offsetMs = capturedAt - this.started;
    if (this.state.phase !== "recording" || offsetMs < 0 || offsetMs > C.durationMs || this.frames.length >= C.maxFrames || (this.frames.length && offsetMs <= this.frames.at(-1)!.offsetMs)) return;
    this.frames.push({ ...frame, offsetMs });
  }
  stop(stoppedBy: "manual" | "duration" = "manual") {
    if (this.state.phase === "countdown") { this.cancel(); return; }
    if (this.state.phase !== "recording" || !this.metadata) return;
    if (this.timer !== undefined) this.clock.cancel(this.timer);
    const m = this.metadata, durationMs = Math.max(0, this.clock.now() - this.started);
    const frames = this.frames; this.frames = [];
    const sample: TemporalSample = {
      schemaVersion: 1, id: this.clock.id(), vocabularyVersion: m.vocabularyVersion, labelId: m.label.id,
      participantId: m.participantId, sessionId: m.sessionId, take: m.take,
      startedAt: new Date(this.wallStarted).toISOString(), endedAt: new Date(this.wallStarted + durationMs).toISOString(), durationMs,
      stoppedBy, detector: { name: "@mediapipe/hands", version: C.detectorVersion, maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: C.hands.minDetectionConfidence, minTrackingConfidence: C.hands.minTrackingConfidence },
      orientation: { inputMirrored: false, previewMirrored: true, handedness: "swap-unmirrored", width: m.width, height: m.height },
      consent: { confirmed: true, protocolVersion: C.consentVersion, confirmedAt: m.consentAt },
      appVersion: C.appVersion, frames, quality: assessQuality({ frames, durationMs }, m.label.handUsage),
    };
    this.metadata = undefined;
    this.state = { phase: "review", remainingMs: 0, frames: frames.length, sample }; this.emit(this.state);
  }
  cancel() {
    if (this.timer !== undefined) this.clock.cancel(this.timer);
    this.timer = undefined; this.metadata = undefined; this.frames = [];
    this.state = { phase: "idle", remainingMs: 0, frames: 0, sample: null };
    if (!this.disposed) this.emit(this.state);
  }
  dispose() { this.disposed = true; this.cancel(); }
}
