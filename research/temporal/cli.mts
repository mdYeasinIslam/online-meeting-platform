import { mkdir, access } from "node:fs/promises";
import path from "node:path";
import { validateConfig } from "./config.ts";
import { hash, json, loadRaw, readVocabulary, readiness, validateSplit, writeJSON, safeParent } from "./data.ts";
import { prepare, train, select, evaluate, exportSelected, environment } from "./experiment.ts";
import { inferenceContract } from "./contract.ts";
import { smoke } from "./smoke.ts";
import { compareBrowser } from "./compare-browser.ts";
const [command, ...args] = process.argv.slice(2);
async function main() {
  const options = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) { if (!["--config", "--input", "--vocabulary", "--split", "--run", "--report"].includes(args[i]) || !args[i + 1] || options.has(args[i])) throw new Error("Invalid or duplicate option"); options.set(args[i], args[i + 1]); }
  const config = validateConfig(await json(options.get("--config") ?? "research/temporal/config/baseline-v1.json"));
  const root = path.resolve("research/temporal/generated"); await safeParent(root); await mkdir(root, { recursive: true }); await safeParent(path.join(root, "run"));
  const runId = options.get("--run") ?? "";
  if (runId && !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(runId)) throw new Error("Run ID must be a simple unique name");
  const directory = path.join(root, runId);
  if (command === "environment") { console.info(JSON.stringify(await environment(), null, 2)); return; }
  if (command === "smoke") { console.info(JSON.stringify(await smoke(root, config), null, 2)); return; }
  if (["gru", "lstm", "select", "evaluate", "export", "compare"].includes(command)) {
    if (!runId) throw new Error("--run is required");
    const result = command === "gru" || command === "lstm" ? await train(directory, command) : command === "select" ? await select(directory) : command === "evaluate" ? await evaluate(directory) : command === "export" ? await exportSelected(directory) : await compareBrowser(directory);
    console.info(JSON.stringify(result, null, 2)); return;
  }
  if (!["readiness", "prepare", "reproduce"].includes(command)) throw new Error("Commands: environment|readiness|prepare|gru|lstm|select|evaluate|export|compare|reproduce|smoke");
  const vocabulary = await readVocabulary(options.get("--vocabulary") ?? "dataset/manifests/vocabulary.json");
  const raw = await loadRaw(options.get("--input") ?? "dataset/raw");
  const splitFile = path.resolve(options.get("--split") ?? "dataset/splits/day5-v1.json");
  if (!splitFile.startsWith(path.resolve("dataset/splits") + path.sep)) throw new Error("Split locks belong in dataset/splits");
  await safeParent(splitFile);
  let locked = false;
  try { await access(splitFile); locked = true; } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  const storedSplit = locked ? await json(splitFile) : undefined;
  const gate = readiness(raw.values, vocabulary, config, false, storedSplit);
  let split = gate.split;
  if (locked) {
    try {
      const stored = await json(splitFile) as { datasetSha256?: string; vocabularySha256?: string };
      split = validateSplit(stored, gate.samples, vocabulary);
      if (stored.datasetSha256 !== hash(gate.samples) || stored.vocabularySha256 !== hash(vocabulary) || split.seed !== config.splitSeed || JSON.stringify(split.ratios) !== JSON.stringify(config.splitRatios)) throw new Error("Locked split corpus/vocabulary/configuration changed; do not silently reshuffle the test set");
    } catch (error) { gate.reasons.push((error as Error).message); }
  }
  const report = { status: gate.reasons.length ? "blocked" : "ready", timestamp: new Date().toISOString(), kind: "real-data-readiness", reasons: gate.reasons, statistics: gate.statistics, vocabulary: { version: vocabulary.version, candidates: vocabulary.labels.length, reviewed: vocabulary.labels.filter(label => label.reviewStatus === "reviewed").length, active: gate.labels.length }, files: raw.files, split: split ? { seed: split.seed, groups: split.splits, warnings: split.warnings, locked } : null, realTrainingExecuted: false, realMetrics: null, export: "blocked until real selection and evaluation", inferenceContract: inferenceContract(config, vocabulary, "blocked", { vocabulary: hash(vocabulary), split: split ? hash(split) : null }) };
  if (options.has("--report")) {
    const destination = path.resolve(options.get("--report")!);
    if (!destination.startsWith(path.resolve("research/temporal/reports") + path.sep)) throw new Error("Reports must stay in research/temporal/reports");
    await writeJSON(destination, report);
  }
  if (command === "readiness") { console.info(JSON.stringify(report, null, 2)); if (gate.reasons.length) process.exitCode = 2; return; }
  if (gate.reasons.length || !split) throw new Error(`Real training blocked: ${gate.reasons.join("; ")}`);
  if (!runId) throw new Error("Use --run with a unique experiment name");
  if (!locked) {
    if (!splitFile.startsWith(path.resolve("dataset/splits") + path.sep)) throw new Error("Split locks belong in dataset/splits");
    await writeJSON(splitFile, { ...split, datasetSha256: hash(gate.samples), vocabularySha256: hash(vocabulary) });
    split = validateSplit(await json(splitFile), gate.samples, vocabulary);
  }
  await prepare(directory, gate.samples, vocabulary, split, config, splitFile);
  await writeJSON(path.join(directory, "source-files.json"), raw.files);
  if (command === "reproduce") { await train(directory, "gru"); await train(directory, "lstm"); await select(directory); await evaluate(directory); await exportSelected(directory); }
  console.info(`Experiment ${runId}: ${command} completed.`);
}
try { await main(); } catch (error) { console.error((error as Error).message); process.exitCode = 1; }
