export interface VocabularyLabel {
  id: string; bangla: string; englishGloss: string; category: string;
  signType: "static" | "dynamic" | "unknown";
  handUsage: "one" | "two" | "unknown";
  referenceUrl: string | null; reviewStatus: "provisional" | "reviewed";
  reviewerNotes: string; active: boolean;
}
export interface Vocabulary { schemaVersion: 1; version: string; notes: string; labels: VocabularyLabel[]; }
export interface Point { x: number; y: number; z: number; }
export interface HandObservation {
  landmarks: Point[];
  reportedHandedness: "Left" | "Right" | null;
  handednessConfidence: number | null;
  detectionConfidence: null; // Installed Hands API does not expose per-hand detection confidence.
}
export interface TemporalFrame {
  offsetMs: number;
  left: HandObservation | null; right: HandObservation | null;
  unassigned: HandObservation[];
  validity: { left: boolean; right: boolean };
}
export interface Quality {
  status: "accepted" | "warning" | "rejected";
  reasons: string[];
  durationMs: number; frameCount: number; validFrames: number;
  effectiveFps: number; missingRatio: number; unassignedFrames: number;
}
export interface TemporalSample {
  schemaVersion: 1; id: string; vocabularyVersion: string; labelId: string;
  participantId: string; sessionId: string; take: number;
  startedAt: string; endedAt: string; durationMs: number;
  stoppedBy: "duration" | "manual";
  detector: { name: "@mediapipe/hands"; version: string; maxNumHands: 2; modelComplexity: 1; minDetectionConfidence: number; minTrackingConfidence: number };
  orientation: { inputMirrored: false; previewMirrored: true; handedness: "swap-unmirrored"; width: number; height: number };
  consent: { confirmed: true; protocolVersion: string; confirmedAt: string };
  appVersion: string; frames: TemporalFrame[]; quality: Quality;
}
export interface SampleCheck { sample?: TemporalSample; quality?: Quality; errors: string[]; }
export interface DatasetCheck { samples: TemporalSample[]; rejected: { index: number; reasons: string[] }[]; warnings: { id: string; reasons: string[] }[]; total: number; }
