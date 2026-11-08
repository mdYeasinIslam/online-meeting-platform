import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as tf from "@tensorflow/tfjs";
import { loadStaticLayersModel } from "../src/@modules/sign-recognition/model-loader.ts";
import { decodeProbabilities, extractFeatures, validateLabels } from "../src/@modules/sign-recognition/diagnostics.ts";
import { syntheticHand, randomGenerator } from "./lib/static-probes.ts";
const root = new URL("../public/model/", import.meta.url);
const manifestBytes = await readFile(new URL("model.json", root));
const manifest = JSON.parse(manifestBytes.toString());
const labels = validateLabels(JSON.parse(await readFile(new URL("labels.json", root), "utf8")));
const assetNames: string[] = ["model.json", "labels.json", ...manifest.weightsManifest.flatMap((group: { paths: string[] }) => group.paths)];
const assets = await Promise.all(assetNames.map(async name => { const bytes = await readFile(new URL(name, root)); return { name, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") }; }));
const shards = await Promise.all(assetNames.slice(2).map(name => readFile(new URL(name, root))));
const raw = Buffer.concat(shards), weightData = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
const before = tf.memory().numTensors;
const model = await loadStaticLayersModel(tf.io.fromMemory({ modelTopology: manifest.modelTopology, weightSpecs: manifest.weightsManifest.flatMap((group: { weights: tf.io.WeightsManifestEntry[] }) => group.weights), weightData }));
const stats = (values: number[]) => ({ min: Math.min(...values), max: Math.max(...values), mean: values.reduce((a, b) => a + b, 0) / values.length, l2: Math.hypot(...values) });
try {
  const weights = model.weights.map(weight => ({ name: weight.originalName, shape: weight.shape, finite: Array.from(weight.read().dataSync()).every(Number.isFinite), ...stats(Array.from(weight.read().dataSync())) }));
  const outputBias = Array.from(model.weights.find(weight => weight.originalName === "dense_2/bias")!.read().dataSync());
  const outputKernel = Array.from(model.weights.find(weight => weight.originalName === "dense_2/kernel")!.read().dataSync());
  const random = randomGenerator();
  const inputs = [{ name: "zero-vector (rejected by live feature guard)", group: "raw-vector", values: Array(63).fill(0) }, { name: "small-ramp", group: "raw-vector", values: Array.from({ length: 63 }, (_, index) => (index - 31) / 31000) }];
  for (let index = 0; index < 64; index++) inputs.push({ name: `seed410-random-${index}`, group: "raw-vector", values: Array.from({ length: 63 }, () => random() * 2 - 1) });
  for (let index = 0; index < 24; index++) {
    const points = syntheticHand((index % 6) / 5, 0.4 + Math.floor(index / 6) * 0.4, 0.01 + (index % 3) * 0.02);
    for (const mirror of [false, true]) {
      const features = extractFeatures(points.map(point => ({ ...point, x: mirror ? 1 - point.x : point.x })));
      if ("error" in features) throw new Error(features.error);
      inputs.push({ name: `synthetic-geometry-${index}${mirror ? "-x-reflected-sensitivity-probe" : ""}`, group: mirror ? "synthetic-reflected" : "synthetic", values: features.values });
    }
  }
  const means = Array(36).fill(0) as number[];
  const groupWins: Record<string, Record<string, number>> = {};
  const probeResults = inputs.map(input => {
    const scores = tf.tidy(() => Array.from((model.predict(tf.tensor2d([input.values], [1, 63], "float32")) as tf.Tensor).dataSync()));
    const decoded = decodeProbabilities(scores, labels); if ("error" in decoded) throw new Error(decoded.error);
    scores.forEach((value, index) => { means[index] += value / inputs.length; });
    const wins = groupWins[input.group] ??= {}; wins[String(decoded.winner.index)] = (wins[String(decoded.winner.index)] ?? 0) + 1;
    return { name: input.name, group: input.group, featureSummary: stats(input.values), featureSha256: createHash("sha256").update(JSON.stringify(input.values)).digest("hex"), winner: decoded.winner, top5: decoded.top5, probabilitySum: decoded.sum };
  });
  const geometries = inputs.filter(input => input.group !== "raw-vector");
  const distances: number[] = [];
  for (let a = 0; a < geometries.length; a++) for (let b = a + 1; b < geometries.length; b++) distances.push(Math.hypot(...geometries[a].values.map((value, index) => value - geometries[b].values[index])));
  const loaded = tf.memory().numTensors, started = performance.now();
  for (let i = 0; i < 200; i++) tf.tidy(() => (model.predict(tf.tensor2d([inputs[i % inputs.length].values], [1, 63])) as tf.Tensor).dataSync());
  const memory = { backend: tf.getBackend(), intervalInferences: 200, meanMs: (performance.now() - started) / 200, beforeLoad: before, loaded, afterInterval: tf.memory().numTensors, tensorCountStable: loaded === tf.memory().numTensors, memoryAccountingUnreliable: tf.memory().unreliable };
  model.dispose();
  const report = { purpose: "Deterministic technical probes only; no real signs, no accuracy evaluation or training compatibility proof.", authenticLabeledSamples: 0, assets, inputShape: model.inputs[0].shape, outputShape: model.outputs[0].shape, labels, weights, outputColumns: labels.map((label, index) => ({ index, label, bias: outputBias[index], kernel: stats(Array.from({ length: 64 }, (_, row) => outputKernel[row * 36 + index])), meanProbeProbability: means[index] })), groupWins, syntheticPairwiseFeatureL2: stats(distances), uniqueFeatureVectors: new Set(probeResults.map(probe => probe.featureSha256)).size, probeCount: inputs.length, probes: probeResults, memory: { ...memory, afterDispose: tf.memory().numTensors } };
  const destination = process.argv[2];
  if (destination) await writeFile(destination, JSON.stringify(report, null, 2) + "\n");
  else console.info(JSON.stringify(report, null, 2));
  console.error(JSON.stringify({ probeCount: inputs.length, groupWins, memory: report.memory }));
} finally { if (tf.memory().numTensors > before) model.dispose(); }
