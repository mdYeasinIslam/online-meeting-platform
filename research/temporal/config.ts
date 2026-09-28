export interface Config {
  schemaVersion: 1; preprocessingVersion: "bdsl-temporal-v1"; modelVersion: string;
  seed: number; splitSeed: string; splitRatios: number[]; sequenceLength: number;
  maxInterpolationGapMs: number; minimumScale: number; minimumResampledValidFrames: number;
  qualityPolicy: "accepted-only"; normalization: "shared-sample-geometric"; datasetNormalization: "none";
  augmentation: { enabled: boolean; coordinateJitter: number };
  units: number; denseUnits: number; dropout: number; learningRate: number; batchSize: number;
  epochs: number; patience: number; minDelta: number; selection: "validation-loss"; classWeights: false; exportTolerance: number;
}
export const SLOTS = ["left", "right"] as const;
export const LANDMARKS = 21, AXES = 3;
export const COORDINATES = SLOTS.length * LANDMARKS * AXES;
export const FEATURES = COORDINATES + SLOTS.length;
export function validateConfig(input: unknown): Config {
  if (!input || typeof input !== "object") throw new Error("Missing configuration");
  const c = input as Config;
  if (c.schemaVersion !== 1 || c.preprocessingVersion !== "bdsl-temporal-v1" || c.normalization !== "shared-sample-geometric" || c.datasetNormalization !== "none" || c.qualityPolicy !== "accepted-only" || c.selection !== "validation-loss" || c.classWeights !== false || !c.modelVersion || !c.splitSeed) throw new Error("Unsupported configuration policy/version");
  for (const value of [c.seed, c.sequenceLength, c.minimumResampledValidFrames, c.units, c.denseUnits, c.batchSize, c.epochs, c.patience]) if (!Number.isInteger(value) || value < 1) throw new Error("Expected positive integer configuration");
  if (c.sequenceLength < 2 || c.sequenceLength > 256 || c.minimumResampledValidFrames > c.sequenceLength || c.units > 128 || c.denseUnits > 128 || c.epochs > 1000) throw new Error("Configuration exceeds baseline limits");
  for (const value of [c.maxInterpolationGapMs, c.minimumScale, c.learningRate, c.exportTolerance]) if (!Number.isFinite(value) || value <= 0) throw new Error("Expected positive finite configuration");
  if (!Number.isFinite(c.minDelta) || c.minDelta < 0 || !Number.isFinite(c.dropout) || c.dropout < 0 || c.dropout >= 1 || !c.augmentation || typeof c.augmentation.enabled !== "boolean" || !Number.isFinite(c.augmentation.coordinateJitter) || c.augmentation.coordinateJitter < 0 || c.augmentation.coordinateJitter > 0.05) throw new Error("Invalid training/augmentation configuration");
  if (!Array.isArray(c.splitRatios) || c.splitRatios.length !== 3 || c.splitRatios.some(n => !Number.isFinite(n) || n <= 0) || Math.abs(c.splitRatios.reduce((a, b) => a + b, 0) - 1) > 1e-6) throw new Error("Invalid group split ratios");
  return c;
}
export function seeded(seed: number) { let state = seed >>> 0; return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; }; }
