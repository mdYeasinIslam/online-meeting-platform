import * as tf from "@tensorflow/tfjs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { FEATURES, type Config } from "./config.ts";
import type { Sequence } from "./preprocess.ts";
export type Architecture = "gru" | "lstm";
export function buildModel(architecture: Architecture, classes: number, config: Config) {
  if (!["gru", "lstm"].includes(architecture) || !Number.isInteger(classes) || classes < 2) throw new Error("Invalid model architecture/classes");
  const model = tf.sequential();
  model.add(tf.layers.masking({ inputShape: [config.sequenceLength, FEATURES], maskValue: 0 }));
  const recurrent = { units: config.units, returnSequences: false, kernelInitializer: tf.initializers.glorotUniform({ seed: config.seed }), recurrentInitializer: tf.initializers.glorotUniform({ seed: config.seed + 1 }), biasInitializer: "zeros" as const };
  model.add(architecture === "gru" ? tf.layers.gru(recurrent) : tf.layers.lstm(recurrent));
  model.add(tf.layers.dropout({ rate: config.dropout, seed: config.seed + 2 }));
  model.add(tf.layers.dense({ units: config.denseUnits, activation: "relu", kernelInitializer: tf.initializers.glorotUniform({ seed: config.seed + 3 }) }));
  model.add(tf.layers.dense({ units: classes, activation: "softmax", kernelInitializer: tf.initializers.glorotUniform({ seed: config.seed + 4 }) }));
  model.compile({ optimizer: tf.train.adam(config.learningRate), loss: "categoricalCrossentropy", metrics: ["accuracy"] });
  return model;
}
export function tensors(sequences: Sequence[], config: Config, classes: number) {
  if (!sequences.length || sequences.some(sample => sample.values.length !== config.sequenceLength || sample.values.some(row => row.length !== FEATURES || !row.every(Number.isFinite)) || !Number.isInteger(sample.label) || sample.label < 0 || sample.label >= classes)) throw new Error("Invalid tensor sequences");
  return { x: tf.tensor3d(sequences.map(sample => sample.values), [sequences.length, config.sequenceLength, FEATURES], "float32"), y: tf.tidy(() => tf.oneHot(tf.tensor1d(sequences.map(sample => sample.label), "int32"), classes)) };
}
export async function saveModel(model: tf.LayersModel, directory: string) {
  await model.save(tf.io.withSaveHandler(async artifacts => {
    if (!artifacts.weightData || !artifacts.weightSpecs) throw new Error("Missing checkpoint weights");
    const buffers = Array.isArray(artifacts.weightData) ? artifacts.weightData : [artifacts.weightData];
    await writeFile(path.join(directory, "weights.bin"), Buffer.concat(buffers.map(buffer => Buffer.from(buffer))), { mode: 0o600 });
    await writeFile(path.join(directory, "model.json"), JSON.stringify({ format: "layers-model", generatedBy: `TensorFlow.js ${tf.version.tfjs}`, modelTopology: artifacts.modelTopology, weightsManifest: [{ paths: ["weights.bin"], weights: artifacts.weightSpecs }] }), { mode: 0o600 });
    return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: "JSON", modelTopologyBytes: JSON.stringify(artifacts.modelTopology).length, weightSpecsBytes: JSON.stringify(artifacts.weightSpecs).length, weightDataBytes: buffers.reduce((sum, data) => sum + data.byteLength, 0) } };
  }));
}
export async function loadModel(directory: string) {
  const manifest = JSON.parse(await readFile(path.join(directory, "model.json"), "utf8"));
  const raw = await readFile(path.join(directory, "weights.bin"));
  return tf.loadLayersModel(tf.io.fromMemory({ modelTopology: manifest.modelTopology, weightSpecs: manifest.weightsManifest[0].weights, weightData: raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) }), { strict: true });
}
export function predict(model: tf.LayersModel, sequences: Sequence[], config: Config): number[][] {
  return tf.tidy(() => (model.predict(tf.tensor3d(sequences.map(sample => sample.values), [sequences.length, config.sequenceLength, FEATURES])) as tf.Tensor).arraySync() as number[][]);
}
