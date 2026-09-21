import type { AcceptedText } from "@/src/@modules/captions/types";
import type { Prediction } from "./types";
export interface StabilizerConfig { confidenceThreshold: number; windowSize: number; majorityRatio: number; cooldownMs: number; noHandResetMs: number; }
export const DEFAULT_STABILIZER_CONFIG: StabilizerConfig = { confidenceThreshold: 0.8, windowSize: 8, majorityRatio: 0.75, cooldownMs: 1200, noHandResetMs: 500 };
export class PredictionStabilizer {
  private config: StabilizerConfig;
  private window: string[] = [];
  private lastText = "";
  private lastEmission = -Infinity;
  private noHandSince: number | null = null;
  constructor(config: Partial<StabilizerConfig> = {}) {
    this.config = { ...DEFAULT_STABILIZER_CONFIG, ...config };
    const c = this.config;
    if (!Number.isInteger(c.windowSize) || c.windowSize < 1 || c.windowSize > 512 || !Number.isFinite(c.confidenceThreshold) || c.confidenceThreshold < 0 || c.confidenceThreshold > 1 || !Number.isFinite(c.majorityRatio) || c.majorityRatio <= 0.5 || c.majorityRatio > 1 || !Number.isFinite(c.cooldownMs) || c.cooldownMs < 0 || !Number.isFinite(c.noHandResetMs) || c.noHandResetMs < 0) throw new Error("Invalid stabilization configuration.");
  }
  push(prediction: Prediction): AcceptedText | null {
    if (!Number.isFinite(prediction.timestamp)) return null;
    if (prediction.state === "no-hand") {
      this.window = []; this.noHandSince ??= prediction.timestamp;
      if (prediction.timestamp - this.noHandSince >= this.config.noHandResetMs) this.lastText = "";
      return null;
    }
    this.noHandSince = null;
    if (prediction.state !== "prediction" || !Number.isFinite(prediction.confidence) || prediction.confidence < this.config.confidenceThreshold || prediction.confidence > 1 || !prediction.text.trim()) { this.window = []; return null; }
    this.window.push(prediction.text);
    if (this.window.length > this.config.windowSize) this.window.shift();
    if (this.window.length < this.config.windowSize) return null;
    const counts = new Map<string, number>();
    for (const text of this.window) counts.set(text, (counts.get(text) ?? 0) + 1);
    const [text, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (text !== prediction.text || count / this.config.windowSize < this.config.majorityRatio || text === this.lastText || prediction.timestamp - this.lastEmission < this.config.cooldownMs) return null;
    this.lastText = text; this.lastEmission = prediction.timestamp;
    return { text, timestamp: prediction.timestamp };
  }
  reset() { this.window = []; this.lastText = ""; this.lastEmission = -Infinity; this.noHandSince = null; }
}
