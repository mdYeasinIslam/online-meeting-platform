import * as tf from "@tensorflow/tfjs";
import { loadStaticLayersModel, ModelAssetMissingError } from "./model-loader.ts";
import { decodeProbabilities, extractFeatures, validateLabels, type PredictionDiagnostics } from "./diagnostics.ts";
import { StaticHandSelector } from "./hand-selection.ts";
import type { RecognitionFrame, Prediction, SignRecognitionEngine } from "./types";
/** Preserved one-hand, 63-feature MLP. Isolated alphabets only, not sentences. */
export class StaticAlphabetEngine implements SignRecognitionEngine {
  readonly kind = "static-alphabet" as const;
  private model: tf.LayersModel | null = null;
  private labels: string[] = [];
  private selector = new StaticHandSelector();
  private loading?: Promise<void>;
  private disposed = false;
  async load() {
    if (this.disposed) throw new Error("Recognition engine is disposed.");
    if (this.model) return;
    this.loading ??= this.loadAssets().catch(error => { this.loading = undefined; throw error; });
    await this.loading;
  }
  private async loadAssets() {
    await tf.ready();
    const model = await loadStaticLayersModel();
    try {
      const response = await fetch("/model/labels.json");
      if (response.status === 404) throw new ModelAssetMissingError();
      if (!response.ok) throw new Error("Cannot load model labels.");
      const labels = validateLabels(await response.json());
      if (model.inputs.length !== 1 || model.outputs.length !== 1 || model.inputs[0].shape.length !== 2 || model.inputs[0].shape[1] !== 63 || model.outputs[0].shape.length !== 2 || model.outputs[0].shape[1] !== 36 || model.inputs[0].dtype !== "float32") throw new Error("Unexpected static model shape or dtype.");
      if (this.disposed) throw new Error("Recognition engine is disposed.");
      this.labels = labels; this.model = model;
    } catch (error) { model.dispose(); throw error; }
  }
  async predict(frame: RecognitionFrame): Promise<Prediction> {
    const selected = this.selector.select(frame.hands);
    const diagnostics: PredictionDiagnostics = { detectedHands: frame.hands.length, handedness: frame.hands.map(hand => ({ side: hand.side, confidence: hand.confidence !== undefined && Number.isFinite(hand.confidence) && hand.confidence >= 0 && hand.confidence <= 1 ? hand.confidence : undefined, landmarkCount: hand.landmarks.length })), selectedHand: selected.index, handChanged: selected.changed, landmarkCount: selected.index === null ? 0 : frame.hands[selected.index].landmarks.length };
    if (!frame.hands.length) return { state: "no-hand", timestamp: frame.timestamp, diagnostics };
    if (selected.index === null) { diagnostics.featureError = "No complete finite 21-landmark hand"; return { state: "unknown", timestamp: frame.timestamp, diagnostics }; }
    const features = extractFeatures(frame.hands[selected.index].landmarks);
    if ("error" in features) { diagnostics.featureError = features.error; return { state: "unknown", timestamp: frame.timestamp, diagnostics }; }
    diagnostics.features = features.summary;
    if (!this.model) throw new Error("Load the sign model before prediction.");
    const started = performance.now();
    const scores = tf.tidy(() => {
      const input = tf.tensor2d([features.values], [1, 63], "float32");
      return Array.from((this.model!.predict(input) as tf.Tensor).dataSync());
    });
    diagnostics.inferenceMs = performance.now() - started;
    const decoded = decodeProbabilities(scores, this.labels);
    diagnostics.probabilitySum = decoded.sum; diagnostics.finiteOutputs = decoded.finite;
    if ("error" in decoded) { diagnostics.outputError = decoded.error; return { state: "unknown", timestamp: frame.timestamp, diagnostics }; }
    diagnostics.top5 = decoded.top5; diagnostics.winnerIndex = decoded.winner.index;
    return { state: "prediction", text: decoded.winner.label, confidence: decoded.winner.probability, timestamp: frame.timestamp, diagnostics };
  }
  reset() { this.selector.reset(); }
  dispose() { this.disposed = true; this.reset(); this.model?.dispose(); this.model = null; }
}
