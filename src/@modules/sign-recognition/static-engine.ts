import * as tf from "@tensorflow/tfjs";
import { loadStaticLayersModel, ModelAssetMissingError } from "./model-loader.ts";
import { normalizeLandmarks } from "./normalization.ts";
import type { RecognitionFrame, Prediction, SignRecognitionEngine } from "./types";
/** Preserved one-hand, 63-feature MLP. Isolated alphabets only, not sentences. */
export class StaticAlphabetEngine implements SignRecognitionEngine {
  readonly kind = "static-alphabet" as const;
  private model: tf.LayersModel | null = null;
  private labels: Record<string, string> = {};
  async load() {
    if (this.model) return;
    await tf.ready();
    const model = await loadStaticLayersModel();
    try {
      const response = await fetch("/model/labels.json");
      if (response.status === 404) throw new ModelAssetMissingError();
      if (!response.ok) throw new Error("Cannot load model labels.");
      const labels: unknown = await response.json();
      if (!labels || typeof labels !== "object" || Array.isArray(labels) || Object.values(labels).some(value => typeof value !== "string") || Object.keys(labels).length !== model.outputs[0].shape[1]) throw new Error("Invalid model labels.");
      if (model.inputs[0].shape[1] !== 63 || model.outputs[0].shape[1] !== 36 || Array.from({ length: 36 }, (_, i) => String(i)).some(key => !Object.hasOwn(labels, key))) throw new Error("Unexpected static model shape or label indices.");
      this.labels = labels as Record<string, string>;
      this.model = model;
    } catch (error) { model.dispose(); throw error; }
  }
  async predict(frame: RecognitionFrame): Promise<Prediction> {
    const landmarks = frame.hands[0]?.landmarks;
    if (!landmarks) return { state: "no-hand", timestamp: frame.timestamp };
    if (!this.model) throw new Error("Load the sign model before prediction.");
    if (landmarks.length !== 21 || landmarks.some(point => ![point.x, point.y, point.z].every(Number.isFinite))) return { state: "unknown", timestamp: frame.timestamp };
    const scores = tf.tidy(() => {
      const input = tf.tensor2d([normalizeLandmarks(landmarks)], [1, 63]);
      return Array.from((this.model!.predict(input) as tf.Tensor).dataSync());
    });
    const confidence = Math.max(...scores);
    const text = this.labels[String(scores.indexOf(confidence))];
    return text && Number.isFinite(confidence) ? { state: "prediction", text, confidence, timestamp: frame.timestamp } : { state: "unknown", timestamp: frame.timestamp };
  }
  dispose() { this.model?.dispose(); this.model = null; }
}
