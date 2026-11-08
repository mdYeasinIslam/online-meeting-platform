import { lstat, readdir, readFile, mkdir, writeFile, realpath } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { COLLECTION } from "../../src/@modules/research/config.ts";
import { decodeBundle, validateDataset, datasetStatistics } from "../../src/@modules/research/dataset.ts";
import { validateVocabulary } from "../../src/@modules/research/vocabulary.ts";
import { checkLeakage, splitDataset, SPLITS, type SplitManifest } from "../../src/@modules/research/split.ts";
import type { TemporalSample, Vocabulary } from "../../src/@modules/research/types";
import { labelMap } from "./preprocess.ts";
import type { Config } from "./config.ts";
export const hash = (value: unknown) => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
export async function json(file: string) { return JSON.parse(await readFile(file, "utf8")) as unknown; }
export async function safeParent(file: string) {
  const parent = path.dirname(path.resolve(file));
  if (await realpath(parent) !== parent) throw new Error("Output paths cannot contain symbolic links");
}
export async function writeJSON(file: string, value: unknown) { await safeParent(file); await writeFile(file, JSON.stringify(value, null, 2) + "\n", { flag: "wx", mode: 0o600 }); }
export async function newDirectory(directory: string) { await safeParent(directory); await mkdir(directory, { recursive: false, mode: 0o700 }); }
export async function loadRaw(input: string) {
  const values: unknown[] = [], files: { path: string; sha256: string }[] = [];
  let totalBytes = 0;
  // Check every path component, including an input passed beneath a symlink.
  if (await realpath(input) !== path.resolve(input)) throw new Error("Raw source cannot use symbolic links");
  async function visit(file: string, depth = 0): Promise<void> {
    if (depth > 8) throw new Error("Dataset nesting limit");
    const info = await lstat(file);
    if (info.isSymbolicLink()) throw new Error("Raw source cannot use symbolic links");
    if (info.isDirectory()) { for (const name of (await readdir(file)).sort()) if (!name.startsWith(".")) await visit(path.join(file, name), depth + 1); return; }
    if (!file.endsWith(".json")) return;
    totalBytes += info.size;
    if (info.size > COLLECTION.maxFileBytes || totalBytes > COLLECTION.maxDatasetBytes) throw new Error("Dataset byte limit");
    if (/(?:^|[/\\])(?:fixtures|synthetic)(?:[/\\]|$)/i.test(file)) throw new Error("Real data cannot come from fixture/synthetic directories");
    const source = await readFile(file, "utf8"), parsed: unknown = JSON.parse(source);
    files.push({ path: file, sha256: hash(source) });
    values.push(...(parsed && typeof parsed === "object" && "kind" in parsed ? decodeBundle(source) : [parsed]));
    if (values.length > COLLECTION.maxDatasetSamples) throw new Error("Dataset count limit");
  }
  await visit(input); return { values, files };
}
export function readiness(values: unknown[], vocabulary: Vocabulary, config: Config, synthetic = false, lockedSplit?: unknown) {
  validateVocabulary(vocabulary);
  const reasons: string[] = [], labels = labelMap(vocabulary), checked = validateDataset(values, vocabulary);
  if (labels.length < 2) reasons.push("At least two active, human-reviewed labels are required; do not activate provisional labels automatically.");
  if (!values.length) reasons.push("No real temporal samples are available.");
  if (checked.rejected.length) reasons.push(`${checked.rejected.length} samples fail the Day-4 validator or duplicate-ID check.`);
  if (checked.warnings.length) reasons.push("Resolve all quality/duplicate-motion warnings before formal training (accepted-only policy).");
  if (!synthetic && (/synthetic|fixture/i.test(vocabulary.version + vocabulary.notes + JSON.stringify(vocabulary.labels)) || checked.samples.some(sample => /synthetic|fixture/i.test(sample.appVersion + sample.vocabularyVersion)))) reasons.push("Synthetic fixtures cannot enter a real experiment.");
  if (synthetic && checked.samples.some(sample => !sample.appVersion.startsWith("synthetic-"))) reasons.push("Real samples cannot enter the synthetic smoke test.");
  let split: SplitManifest | undefined;
  try { split = lockedSplit === undefined ? splitDataset(checked.samples, vocabulary, config.splitSeed, config.splitRatios) : validateSplit(lockedSplit, checked.samples, vocabulary); } catch (error) { reasons.push((error as Error).message); }
  if (split) for (const name of SPLITS) for (const label of labels) if (!checked.samples.some(sample => split!.splits[name].sampleIds.includes(sample.id) && sample.labelId === label.id)) reasons.push(`${name}: missing label ${label.id}; formal per-class comparison blocked.`);
  return { ready: reasons.length === 0, reasons, statistics: datasetStatistics(checked), labels, samples: checked.samples, split, rejected: checked.rejected };
}
export function validateSplit(value: unknown, samples: TemporalSample[], vocabulary: Vocabulary): SplitManifest {
  const m = value as SplitManifest;
  if (!m || m.schemaVersion !== 1 || m.algorithm !== "participant-fisher-yates-v1" || m.vocabularyVersion !== vocabulary.version || m.leakage !== false || !m.seed || !Array.isArray(m.ratios) || m.ratios.length !== 3 || !m.splits) throw new Error("Invalid split metadata");
  for (const name of SPLITS) {
    const group = m.splits[name];
    if (!group || !Array.isArray(group.participants) || !group.participants.length || !Array.isArray(group.sampleIds) || !group.sampleIds.length) throw new Error("Every split requires participants and samples");
    if (group.participants.some(id => !samples.some(sample => sample.participantId === id))) throw new Error("Split contains unknown participant");
  }
  const errors = checkLeakage(m, samples); if (errors.length) throw new Error(errors.join("; "));
  for (const name of SPLITS) for (const label of labelMap(vocabulary)) if (!samples.some(sample => m.splits[name].sampleIds.includes(sample.id) && sample.labelId === label.id)) throw new Error(`${name}: missing label ${label.id}`);
  return m;
}
export async function readVocabulary(file: string) { return validateVocabulary(await json(file)); }
