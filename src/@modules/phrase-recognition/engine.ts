import * as tf from "@tensorflow/tfjs";
import { PHRASE, validatePhraseFeatures } from "./preprocess.ts";
export type PhraseLabel = { index: number; bangla: string; english: string };
const meanings: Record<string, string> = { "হ্যালো": "Hello", "শুভ সকাল": "Good Morning", "শুভরাত্রি": "Good Night", "আপনি কেমন আছেন?": "How are you?", "আমি ভালো আছি": "I am fine" };
export function parsePhraseLabels(value: unknown): PhraseLabel[] {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join() !== "0,1,2,3,4") throw new Error("Expected labels.json indices 0–4.");
  const mapping = value as Record<string, unknown>;
  const labels = Array.from({ length: 5 }, (_, index) => {
    const bangla = mapping[index];
    if (typeof bangla !== "string" || !Object.hasOwn(meanings, bangla)) throw new Error("Unsupported phrase in labels.json.");
    return { index, bangla, english: meanings[bangla] };
  });
  if (new Set(labels.map(label => label.bangla)).size !== 5) throw new Error("Duplicate phrase labels.");
  return labels;
}
export type PhrasePrediction = { label: PhraseLabel; confidence: number; accepted: boolean };
type Dependencies = { model: () => Promise<tf.LayersModel>; labels: () => Promise<unknown> };
const browserDependencies: Dependencies = {
  model: () => tf.loadLayersModel("/phrase-model/model.json", { strict: true }),
  labels: async () => { const response = await fetch("/phrase-model/labels.json"); if (!response.ok) throw new Error(`Label loading failed (${response.status}).`); return response.json(); },
};
/** One model per mounted demo; safe when unmounted during asynchronous loading. */
export class PhraseEngine {
  private model?: tf.LayersModel;
  private loading?: Promise<PhraseLabel[]>;
  private disposed = false;
  private labels: PhraseLabel[] = [];
  private dependencies: Dependencies;
  constructor(dependencies = browserDependencies) { this.dependencies = dependencies; }
  load(): Promise<PhraseLabel[]> {
    if (this.disposed) return Promise.reject(new Error("Phrase engine is closed."));
    this.loading ??= this.initialize(); return this.loading;
  }
  private async initialize() {
    let model: tf.LayersModel | undefined;
    try {
      await tf.ready();
      // Sequential ownership ensures a label failure cannot leak a late model.
      this.labels = parsePhraseLabels(await this.dependencies.labels());
      if (this.disposed) throw new Error("Phrase engine is closed.");
      model = await this.dependencies.model();
      if (this.disposed) throw new Error("Phrase engine is closed.");
      if (model.inputs.length !== 1 || model.outputs.length !== 1 || JSON.stringify(model.inputs[0].shape) !== "[null,32,128]" || JSON.stringify(model.outputs[0].shape) !== "[null,5]") throw new Error("Incompatible phrase model: expected [batch,32,128] → [batch,5].");
      this.model = model;
      return this.labels;
    } catch (error) { model?.dispose(); throw error; }
  }
  predict(values: readonly ArrayLike<number>[], threshold: number = PHRASE.confidenceThreshold): PhrasePrediction {
    if (this.disposed || !this.model) throw new Error("Phrase model is not ready.");
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) throw new Error("Invalid confidence threshold.");
    validatePhraseFeatures(values);
    const probabilities = tf.tidy(() => {
      const input = tf.tensor3d([values.map(row => Array.from(row))], [1, 32, 128], "float32");
      const output = this.model!.predict(input);
      if (Array.isArray(output) || JSON.stringify(output.shape) !== "[1,5]") throw new Error("Invalid output shape.");
      return Array.from(output.dataSync());
    });
    if (probabilities.some(n => !Number.isFinite(n) || n < 0 || n > 1) || Math.abs(probabilities.reduce((a, b) => a + b, 0) - 1) > 0.001) throw new Error("Invalid softmax probabilities.");
    const confidence = Math.max(...probabilities), index = probabilities.indexOf(confidence);
    return { label: this.labels[index], confidence, accepted: confidence >= threshold };
  }
  dispose() { this.disposed = true; this.model?.dispose(); this.model = undefined; }
}
