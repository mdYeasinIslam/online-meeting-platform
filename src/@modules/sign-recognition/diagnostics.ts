import type { Landmark } from "./types";
import { normalizeLandmarks } from "./normalization.ts";
export const STATIC_INPUT_SIZE = 63;
export const STATIC_CLASS_COUNT = 36;
export interface FeatureSummary { length: number; min: number; max: number; mean: number; scale: number; }
export interface RankedClass { index: number; label: string; probability: number; }
export interface PredictionDiagnostics {
  detectedHands: number;
  handedness: { side: string; confidence?: number; landmarkCount?: number }[];
  selectedHand: number | null;
  landmarkCount: number;
  handChanged: boolean;
  featureError?: string;
  features?: FeatureSummary;
  top5?: RankedClass[];
  winnerIndex?: number;
  probabilitySum?: number;
  finiteOutputs?: boolean;
  outputError?: string;
  inferenceMs?: number;
}
export function validateLabels(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid model labels.");
  const map = value as Record<string, unknown>;
  const labels = Array.from({ length: STATIC_CLASS_COUNT }, (_, index) => map[String(index)]);
  if (Object.keys(map).length !== STATIC_CLASS_COUNT || labels.some(label => typeof label !== "string" || !/^[\u0980-\u09ff]+$/u.test(label)) || new Set(labels).size !== STATIC_CLASS_COUNT) throw new Error("Expected 36 unique Bengali labels at indices 0–35.");
  return labels as string[]; // Explicit numeric lookup, never sorted labels or object enumeration.
}
export function extractFeatures(landmarks: Landmark[]): { values: number[]; summary: FeatureSummary } | { error: string } {
  if (landmarks.length !== 21) return { error: "Expected 21 landmarks" };
  if (landmarks.some(point => ![point.x, point.y, point.z].every(Number.isFinite))) return { error: "Non-finite landmark" };
  const wrist = landmarks[0];
  const scale = Math.max(...landmarks.flatMap(point => [Math.abs(point.x - wrist.x), Math.abs(point.y - wrist.y), Math.abs(point.z - wrist.z)]));
  // Numerical degeneracy guard, not a calibrated physical hand-size threshold.
  if (!Number.isFinite(scale) || scale <= 1e-8) return { error: "Degenerate or numerically tiny hand span" };
  const values = normalizeLandmarks(landmarks);
  if (values.length !== STATIC_INPUT_SIZE || !values.every(Number.isFinite)) return { error: "Invalid feature vector" };
  return { values, summary: { length: values.length, min: Math.min(...values), max: Math.max(...values), mean: values.reduce((sum, value) => sum + value, 0) / values.length, scale } };
}
export function decodeProbabilities(scores: number[], labels: string[]) {
  const finite = scores.every(Number.isFinite), sum = scores.reduce((a, b) => a + b, 0);
  if (scores.length !== STATIC_CLASS_COUNT || labels.length !== STATIC_CLASS_COUNT || !finite || scores.some(value => value < 0 || value > 1) || Math.abs(sum - 1) > 1e-3) {
    return { error: "Invalid 36-class probability output", finite, sum } as const;
  }
  const top5 = scores.map((probability, index) => ({ index, label: labels[index], probability })).sort((a, b) => b.probability - a.probability || a.index - b.index).slice(0, 5);
  return { winner: top5[0], top5, finite, sum } as const;
}
