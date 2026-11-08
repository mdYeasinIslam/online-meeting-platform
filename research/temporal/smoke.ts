import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import * as tf from "@tensorflow/tfjs";
import { sample, vocabulary as fixtureVocabulary } from "../../tests/helpers/research-fixture.mjs";
import { validateVocabulary } from "../../src/@modules/research/vocabulary.ts";
import { readiness, writeJSON } from "./data.ts";
import { prepare, train, environment, exportSelected, select, evaluate } from "./experiment.ts";
import { loadModel, predict } from "./model.ts";
import { classificationMetrics } from "./metrics.ts";
import { inferenceContract, validateContract } from "./contract.ts";
import type { Config } from "./config.ts";
export function syntheticDataset() {
  const vocabulary = validateVocabulary(fixtureVocabulary());
  const values = Array.from({ length: 12 }, (_, index) => {
    const value = sample(index + 1, `P${String(Math.floor(index / 2) + 1).padStart(3, "0")}`);
    value.labelId = index % 2 ? "thanks" : "greeting";
    // Distinct invented motions, never physical-sign ground truth.
    value.frames.forEach((frame, t) => frame.left.landmarks.forEach((point, i) => { point.x += Math.sin(t / 7 + index) * i * 0.0005; }));
    return value;
  });
  return { vocabulary, values };
}
export async function smoke(root: string, original: Config) {
  await environment(); await mkdir(root, { recursive: true });
  const directory = path.join(root, `synthetic-smoke-${randomUUID()}`), config = { ...original, epochs: 1 };
  const fixture = syntheticDataset(), gate = readiness(fixture.values, fixture.vocabulary, config, true);
  if (!gate.ready || !gate.split) throw new Error(gate.reasons.join("; "));
  const before = tf.memory().numTensors;
  const data = await prepare(directory, gate.samples, fixture.vocabulary, gate.split, config, "SYNTHETIC-NO-REAL-TEST-LOCK", "synthetic-smoke");
  const observations = [];
  for (const architecture of ["gru", "lstm"] as const) {
    const candidate = await train(directory, architecture), model = await loadModel(path.join(directory, architecture));
    try {
      const first = predict(model, data.groups.validation, config);
      const metrics = classificationMetrics(data.groups.validation.map(sequence => sequence.label), first, gate.labels);
      if (!Number.isFinite(metrics.loss) || first.some(row => row.length !== gate.labels.length)) throw new Error("Smoke evaluation failed");
      const again = await loadModel(path.join(directory, architecture));
      try {
        const second = predict(again, data.groups.validation, config);
        if (Math.max(...first.flatMap((row, i) => row.map((value, j) => Math.abs(value - second[i][j])))) > config.exportTolerance) throw new Error("Checkpoint round-trip mismatch");
      } finally { again.dispose(); }
      observations.push({ architecture, parametersForTwoSyntheticClasses: candidate.parameters, trainingMs: candidate.trainingMs, checkpointBytes: (await readFile(path.join(directory, architecture, "weights.bin"))).length, forward: "passed", oneEpoch: "passed", checkpointRoundTrip: "passed", metricsExecution: "passed" });
    } finally { model.dispose(); }
  }
  await select(directory);
  let evaluationBlocked = false;
  try { await evaluate(directory); } catch (error) { if ((error as Error).message.includes("Synthetic experiments")) evaluationBlocked = true; else throw error; }
  if (!evaluationBlocked) throw new Error("Synthetic formal evaluation unexpectedly allowed");
  const contract = inferenceContract(config, fixture.vocabulary, "synthetic-smoke", { vocabulary: data.vocabularySha256, split: data.splitSha256 }); validateContract(contract);
  let blocked = false; try { await exportSelected(directory); } catch (error) { if ((error as Error).message.includes("Synthetic model")) blocked = true; else throw error; }
  if (!blocked) throw new Error("Synthetic model export unexpectedly allowed");
  const report = { kind: "synthetic-technical-smoke-only", thesisModel: false, realParticipants: 0, realSamples: 0, observations, syntheticMetricsPublished: false, exportAsThesisModel: "blocked", tensorsBefore: before, tensorsAfter: tf.memory().numTensors, directory };
  if (report.tensorsAfter !== before) throw new Error(`Smoke tensor leak: ${before} -> ${report.tensorsAfter}`);
  await writeJSON(path.join(directory, "SMOKE-ONLY.json"), report); return report;
}
