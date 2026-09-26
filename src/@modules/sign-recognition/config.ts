import { DEFAULT_STABILIZER_CONFIG } from "./stabilizer.ts";
export const RECOGNITION_CONFIG = {
  targetFps: 10,
  uiUpdateIntervalMs: 500,
  mediaPipeAssetRoot: "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/",
  hands: { maxNumHands: 2, modelComplexity: 1 as const, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 },
  stabilizer: DEFAULT_STABILIZER_CONFIG,
};
export type RecognitionPhase = "idle" | "loading-mediapipe" | "loading-model" | "ready" | "recognizing" | "no-hand" | "unknown" | "paused" | "asset-missing" | "initialization-error" | "inference-error" | "stopped";
export interface RecognitionStatus {
  phase: RecognitionPhase;
  rawLabel?: string; confidence?: number; acceptedLabel?: string;
  inferenceMs?: number; effectiveFps?: number;
}
export const RECOGNITION_MESSAGES: Record<RecognitionPhase, string> = {
  idle: "Static alphabet recognition is off.",
  "loading-mediapipe": "Loading MediaPipe hand tracking…",
  "loading-model": "Loading the static alphabet model…",
  ready: "Model ready. Show a supported static alphabet sign.",
  recognizing: "Recognizing a static alphabet. Hold your sign steady.",
  "no-hand": "No hand detected. Show your hand to the camera.",
  unknown: "Unknown or low-confidence sign. Adjust your hand and lighting.",
  paused: "Recognition paused. Reconnect and enable your camera to resume; no additional camera access is requested.",
  "asset-missing": "A model asset is missing. Check the model files, then stop and restart recognition.",
  "initialization-error": "Recognition could not initialize. Check network access to model and MediaPipe assets, then stop and restart.",
  "inference-error": "Recognition failed. Stop and restart recognition. Your meeting camera remains on.",
  stopped: "Recognition stopped. Your meeting camera is unchanged.",
};
