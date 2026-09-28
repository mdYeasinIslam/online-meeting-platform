import * as tf from "@tensorflow/tfjs";
import { readFile, writeFile, copyFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { hash, json, newDirectory, writeJSON, validateSplit, readiness } from "./data.ts";
import { augment, labelMap, normalizationState, preprocess, type Sequence } from "./preprocess.ts";
import { buildModel, loadModel, predict, saveModel, tensors, type Architecture } from "./model.ts";
import { FEATURES, seeded, type Config } from "./config.ts";
import { classificationMetrics } from "./metrics.ts";
import { curves, evaluationFigures } from "./figures.ts";
import { inferenceContract, validateContract } from "./contract.ts";
import { SPLITS, type SplitManifest } from "../../src/@modules/research/split.ts";
import type { TemporalSample, Vocabulary } from "../../src/@modules/research/types";
export interface Prepared {
  kind: "real" | "synthetic-smoke"; config: Config; vocabulary: Vocabulary; split: SplitManifest;
  datasetSha256: string; vocabularySha256: string; splitSha256: string; splitFile: string;
  groups: Record<typeof SPLITS[number], Sequence[]>;
}
export async function environment() {
  await tf.setBackend("cpu"); await tf.ready();
  if (tf.version.tfjs !== "4.22.0") throw new Error("Research runtime requires the locked TensorFlow.js 4.22.0");
  let commit = "unavailable";
  try { commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { /* Standalone source archive has no Git commit. */ }
  return { node: process.version, tensorflowjs: tf.version.tfjs, backend: tf.getBackend(), commit, packageLockSha256: hash(await readFile("package-lock.json", "utf8")), nondeterminism: "Seeded initializers/dropout, seeded explicit training permutations, CPU backend. Floating-point/platform and library changes may still differ; no bitwise cross-platform guarantee." };
}
export async function prepare(directory: string, samples: TemporalSample[], vocabulary: Vocabulary, split: SplitManifest, config: Config, splitFile: string, kind: Prepared["kind"] = "real") {
  const gate = readiness(samples, vocabulary, config, kind === "synthetic-smoke", split);
  if (!gate.ready) throw new Error(`Preparation blocked: ${gate.reasons.join("; ")}`);
  validateSplit(split, samples, vocabulary);
  await newDirectory(directory);
  try {
    const start = performance.now();
    const sequences = samples.map(sample => preprocess(sample, vocabulary, config));
    const data: Prepared = { kind, config, vocabulary, split, datasetSha256: hash(samples), vocabularySha256: hash(vocabulary), splitSha256: hash(split), splitFile, groups: Object.fromEntries(SPLITS.map(name => [name, sequences.filter(sample => split.splits[name].sampleIds.includes(sample.sampleId))])) as Prepared["groups"] };
    await writeJSON(path.join(directory, "prepared.json"), data);
    await writeJSON(path.join(directory, "normalization.json"), normalizationState());
    await writeJSON(path.join(directory, "labels.json"), labelMap(vocabulary));
    await writeJSON(path.join(directory, "split.json"), split);
    await writeJSON(path.join(directory, "vocabulary.json"), vocabulary);
    await writeJSON(path.join(directory, "config.json"), config);
    await writeJSON(path.join(directory, "run.json"), { experimentId: path.basename(directory), timestamp: new Date().toISOString(), kind, preparedSha256: hash(data), datasetStatistics: gate.statistics, environment: await environment(), preprocessingMs: performance.now() - start, shape: [samples.length, config.sequenceLength, FEATURES], counts: Object.fromEntries(SPLITS.map(name => [name, { samples: data.groups[name].length, participants: split.splits[name].participants.length, sessions: new Set(data.groups[name].map(sample => `${sample.participantId}/${sample.sessionId}`)).size, labels: split.splits[name].labels }])) });
    return data;
  } catch (error) { await writeJSON(path.join(directory, "prepare-failed.json"), { error: (error as Error).message }); throw error; }
}
export async function readPrepared(directory: string): Promise<Prepared> {
  const data = await json(path.join(directory, "prepared.json")) as Prepared;
  const run = await json(path.join(directory, "run.json")) as { preparedSha256: string };
  if (run.preparedSha256 !== hash(data)) throw new Error("Prepared artifact changed; regenerate a new experiment from raw data");
  // Detect manual changes to the snapshots before using the generated tensors.
  if (data.vocabularySha256 !== hash(data.vocabulary) || data.splitSha256 !== hash(data.split) || hash(data.config) !== hash(await json(path.join(directory, "config.json")))) throw new Error("Experiment snapshots changed");
  return data;
}
interface Candidate { kind: Prepared["kind"]; architecture: Architecture; parameters: number; bestEpoch: number; bestValidationLoss: number; trainingMs: number; checkpointSha256: string; }
async function checkpointHash(directory: string) { return hash([hash(await readFile(path.join(directory, "model.json"), "utf8")), hash((await readFile(path.join(directory, "weights.bin"))).toString("base64"))]); }
export async function train(directory: string, architecture: Architecture) {
  await environment();
  const data = await readPrepared(directory), config = data.config;
  const target = path.join(directory, architecture); await newDirectory(target);
  const model = buildModel(architecture, labelMap(data.vocabulary).length, config);
  const validation = tensors(data.groups.validation, config, labelMap(data.vocabulary).length);
  const history: { epoch: number; loss: number; valLoss: number; accuracy: number; valAccuracy: number; epochMs: number }[] = [];
  const started = performance.now(); let bestLoss = Infinity, bestEpoch = 0, stale = 0;
  let summary = ""; model.summary(undefined, undefined, line => { summary += line + "\n"; });
  await writeFile(path.join(target, "summary.txt"), summary, { flag: "wx" });
  try {
    for (let epoch = 0; epoch < config.epochs; epoch++) {
      const random = seeded(config.seed + epoch), sequences = data.groups.train.map((sample, index) => augment(sample, "train", config, config.seed + epoch * 10000 + index));
      for (let i = sequences.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [sequences[i], sequences[j]] = [sequences[j], sequences[i]]; }
      const training = tensors(sequences, config, labelMap(data.vocabulary).length), epochStart = performance.now();
      try {
        const fit = await model.fit(training.x, training.y, { epochs: 1, batchSize: config.batchSize, validationData: [validation.x, validation.y], shuffle: false, verbose: 0 });
        const numeric = (key: string) => { const value = Number(fit.history[key]?.[0]); if (!Number.isFinite(value)) throw new Error(`Invalid training metric ${key}`); return value; };
        const row = { epoch: epoch + 1, loss: numeric("loss"), valLoss: numeric("val_loss"), accuracy: numeric("acc"), valAccuracy: numeric("val_acc"), epochMs: performance.now() - epochStart }; history.push(row);
        if (row.valLoss < bestLoss - config.minDelta) { bestLoss = row.valLoss; bestEpoch = epoch + 1; stale = 0; await saveModel(model, target); } else stale++;
        if (stale >= config.patience) break;
      } finally { training.x.dispose(); training.y.dispose(); }
    }
    const candidate: Candidate = { kind: data.kind, architecture, parameters: model.countParams(), bestEpoch, bestValidationLoss: bestLoss, trainingMs: performance.now() - started, checkpointSha256: await checkpointHash(target) };
    await writeJSON(path.join(target, "candidate.json"), candidate);
    // Synthetic losses are private mechanics only and never emitted as thesis results.
    await writeJSON(path.join(target, data.kind === "real" ? "history.json" : "SYNTHETIC-NOT-RESEARCH-history.json"), history);
    if (data.kind === "real") await curves(target, history);
    return candidate;
  } catch (error) { await writeJSON(path.join(target, "training-failed.json"), { error: (error as Error).message, history, kind: data.kind }); throw error; }
  finally { validation.x.dispose(); validation.y.dispose(); model.optimizer.dispose(); model.dispose(); }
}
export async function select(directory: string) {
  const candidates = await Promise.all((["gru", "lstm"] as const).map(name => json(path.join(directory, name, "candidate.json")) as Promise<Candidate>));
  for (const candidate of candidates) if (!Number.isFinite(candidate.bestValidationLoss) || candidate.checkpointSha256 !== await checkpointHash(path.join(directory, candidate.architecture))) throw new Error("Invalid candidate/checkpoint");
  candidates.sort((a, b) => a.bestValidationLoss - b.bestValidationLoss || a.parameters - b.parameters);
  const selection = { ...candidates[0], criterion: "lowest best validation loss; exact tie uses fewer parameters", difference: Math.abs(candidates[0].bestValidationLoss - candidates[1].bestValidationLoss), warning: "One validation split does not establish statistically significant superiority." };
  await writeJSON(path.join(directory, "selection.json"), selection); return selection;
}
export async function claimTestEvaluation(splitFile: string, splitSha256: string, experiment: string, checkpoint: string) {
  if (hash(await json(splitFile)) !== splitSha256) throw new Error("Locked split changed since preparation");
  await writeJSON(`${splitFile}.test-used.json`, { experiment, splitSha256, timestamp: new Date().toISOString(), checkpoint });
}
export async function evaluate(directory: string) {
  const data = await readPrepared(directory), selection = await json(path.join(directory, "selection.json")) as Candidate;
  if (data.kind !== "real") throw new Error("Synthetic experiments cannot produce formal held-out evaluation");
  if (selection.checkpointSha256 !== await checkpointHash(path.join(directory, selection.architecture))) throw new Error("Selected checkpoint changed");
  // Claim before opening test inputs; a failed evaluation remains consumed for audit.
  await claimTestEvaluation(data.splitFile, data.splitSha256, directory, selection.checkpointSha256);
  const output = path.join(directory, "evaluation"); await newDirectory(output);
  await environment(); const model = await loadModel(path.join(directory, selection.architecture));
  try {
    const started = performance.now(), probabilities = predict(model, data.groups.test, data.config), batchMs = performance.now() - started;
    const singleStart = performance.now(); predict(model, data.groups.test.slice(0, 1), data.config); const singleMs = performance.now() - singleStart;
    const metrics = classificationMetrics(data.groups.test.map(sample => sample.label), probabilities, labelMap(data.vocabulary));
    await writeJSON(path.join(output, "metrics.json"), { ...metrics, participants: data.split.splits.test.participants.length, sessions: new Set(data.groups.test.map(sample => `${sample.participantId}/${sample.sessionId}`)).size, batchMs, singleMs, scope: "One locked signer-independent test split; development CPU timing, not browser performance." });
    await writeJSON(path.join(output, "confusion.json"), { labels: labelMap(data.vocabulary), matrix: metrics.confusion });
    await evaluationFigures(output, metrics);
    await writeFile(path.join(directory, "REPORT.md"), `# Real temporal experiment\n\nSelected ${selection.architecture} by validation loss ${selection.bestValidationLoss}.\n\nFinal test: ${metrics.samples} samples, ${data.split.splits.test.participants.length} signers. Accuracy ${metrics.accuracy}; macro F1 ${metrics.macro.f1}.\n\nSmall single-split evidence; no statistical superiority claim. Bengali SVG text requires a Bengali-capable font; numeric class indices and UTF-8 JSON/CSV are always retained. See evaluation artifacts and environment snapshots.\n`, { flag: "wx" });
    return metrics;
  } catch (error) { await writeJSON(path.join(output, "failed.json"), { error: (error as Error).message }); throw error; }
  finally { model.dispose(); }
}
export async function exportSelected(directory: string) {
  const data = await readPrepared(directory);
  if (data.kind !== "real") throw new Error("Synthetic model cannot be exported as a thesis model");
  await json(path.join(directory, "evaluation", "metrics.json"));
  const selection = await json(path.join(directory, "selection.json")) as Candidate;
  const source = path.join(directory, selection.architecture);
  if (await checkpointHash(source) !== selection.checkpointSha256) throw new Error("Selected checkpoint changed");
  const target = path.join(directory, "export"); await newDirectory(target);
  const contract = inferenceContract(data.config, data.vocabulary, "real-selected", { vocabulary: data.vocabularySha256, split: data.splitSha256 }); validateContract(contract);
  for (const file of ["model.json", "weights.bin"]) await copyFile(path.join(source, file), path.join(target, file));
  await writeJSON(path.join(target, "inference-contract.json"), contract);
  await writeJSON(path.join(target, "labels.json"), labelMap(data.vocabulary));
  await writeJSON(path.join(target, "preprocessing.json"), data.config);
  await writeJSON(path.join(target, "normalization.json"), normalizationState());
  const model = await loadModel(target);
  try {
    if (model.inputs[0].shape[1] !== data.config.sequenceLength || model.inputs[0].shape[2] !== FEATURES || model.outputs[0].shape[1] !== contract.labels.length) throw new Error("Export shape mismatch");
    const comparison = data.groups.validation.slice(0, 3);
    await writeJSON(path.join(target, "comparison.json"), { provenance: "validation-only; never test samples", input: comparison.map(sample => sample.values), expected: predict(model, comparison, data.config), tolerance: data.config.exportTolerance });
  } finally { model.dispose(); }
  return target;
}
