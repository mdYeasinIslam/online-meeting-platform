/** Local-only dataset CLI. No networking, model training or raw-file mutation. */
import { lstat, mkdir, readdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { COLLECTION as C } from "../src/@modules/research/config.ts";
import { validateVocabulary } from "../src/@modules/research/vocabulary.ts";
import { decodeBundle, validateDataset, datasetStatistics } from "../src/@modules/research/dataset.ts";
import { splitDataset } from "../src/@modules/research/split.ts";
const args = process.argv.slice(2), command = args.shift();
async function main() {
  if (!["vocabulary", "validate", "stats", "split"].includes(command ?? "")) throw new Error("Use vocabulary|validate|stats|split --input dataset/raw --vocabulary dataset/manifests/vocabulary.json [--seed explicit-seed] [--ratios 0.7,0.15,0.15] [--output dataset/reports/report.json].");
  const options = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i], value = args[i + 1];
    if (!["--input", "--vocabulary", "--output", "--seed", "--ratios"].includes(key) || !value || value.startsWith("--") || options.has(key)) throw new Error("Invalid or duplicate CLI option.");
    options.set(key, value);
  }
  const root = await realpath(process.cwd());
  function localPath(value: string) {
    if (value.split(/[\\/]/).includes("..")) throw new Error("Parent traversal is not allowed.");
    const resolved = path.resolve(root, value);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) throw new Error("Dataset paths must stay within the current working directory.");
    return resolved;
  }
  async function verified(value: string) {
    const candidate = localPath(value);
    let current = root;
    for (const part of path.relative(root, candidate).split(path.sep).filter(Boolean)) {
      current = path.join(current, part);
      if ((await lstat(current)).isSymbolicLink()) throw new Error("Dataset paths cannot contain symbolic links.");
    }
    return candidate;
  }
  const vocabularyFile = await verified(options.get("--vocabulary") ?? "dataset/manifests/vocabulary.json");
  if ((await lstat(vocabularyFile)).size > 65536) throw new Error("Vocabulary file exceeds 64 KiB.");
  const vocabulary = validateVocabulary(JSON.parse(await readFile(vocabularyFile, "utf8")));
  let output: unknown;
  if (command === "vocabulary") {
    output = { version: vocabulary.version, labels: vocabulary.labels.length, reviewed: vocabulary.labels.filter(l => l.reviewStatus === "reviewed").length, active: vocabulary.labels.filter(l => l.active).length, collectionReady: vocabulary.labels.some(l => l.active) };
  } else {
    const values: unknown[] = [];
    let bytes = 0, files = 0;
    const visit = async (file: string, depth = 0): Promise<void> => {
      if (depth > 8) throw new Error("Dataset directory nesting exceeds limit.");
      const entry = await lstat(file);
      if (entry.isSymbolicLink()) throw new Error("Dataset symbolic links are not allowed.");
      if (entry.isDirectory()) {
        for (const child of (await readdir(file, { withFileTypes: true })).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
          if (child.isSymbolicLink()) throw new Error("Dataset symbolic links are not allowed.");
          if (child.isDirectory() || child.name.endsWith(".json")) await visit(path.join(file, child.name), depth + 1);
        }
        return;
      }
      if (!entry.isFile() || !file.endsWith(".json")) throw new Error("Expected a JSON file or dataset directory.");
      bytes += entry.size; files++;
      if (entry.size > C.maxFileBytes || bytes > C.maxDatasetBytes || files > C.maxDatasetSamples) throw new Error("Dataset file/count/byte safety limit exceeded.");
      const source = await readFile(file, "utf8");
      let parsed: unknown;
      try { parsed = JSON.parse(source); } catch { throw new Error("Dataset contains malformed JSON."); }
      if (parsed && typeof parsed === "object" && "kind" in parsed) values.push(...decodeBundle(source));
      else values.push(parsed);
      if (values.length > C.maxDatasetSamples) throw new Error("Dataset sample limit exceeded.");
    };
    await visit(await verified(options.get("--input") ?? "dataset/raw"));
    const checked = validateDataset(values, vocabulary);
    const statistics = datasetStatistics(checked);
    if (command === "split") {
      if (checked.rejected.length) throw new Error("Rejected samples prevent splitting. Run validation and resolve them first.");
      if (checked.warnings.some(w => w.reasons.some(r => r.startsWith("Suspiciously identical")))) throw new Error("Identical sequences must be reviewed and deduplicated before splitting.");
      output = splitDataset(checked.samples, vocabulary, options.get("--seed") ?? "", options.has("--ratios") ? options.get("--ratios")!.split(",").map(Number) : undefined);
    } else {
      let splits: unknown = { available: false, reason: "No explicit seed provided; split sizes and leakage are not evaluated." };
      if (options.has("--seed")) {
        if (checked.rejected.length) splits = { available: false, reason: "Resolve rejected samples before splitting." };
        else {
          try {
            const split = splitDataset(checked.samples, vocabulary, options.get("--seed")!, options.has("--ratios") ? options.get("--ratios")!.split(",").map(Number) : undefined);
            splits = { available: true, seed: split.seed, leakage: split.leakage, warnings: split.warnings, groups: Object.fromEntries(Object.entries(split.splits).map(([name, group]) => [name, { samples: group.sampleIds.length, participants: group.participants.length, labels: group.labels }])) };
          } catch (error) { splits = { available: false, reason: error instanceof Error ? error.message : "Split unavailable." }; }
        }
      }
      output = { schemaVersion: 1, vocabularyVersion: vocabulary.version, files, statistics, rejectedSamples: checked.rejected, warnings: checked.warnings, splits };
      if (checked.rejected.length) process.exitCode = 1;
    }
  }
  const serialized = JSON.stringify(output, null, 2) + "\n";
  const destination = options.get("--output");
  if (destination) {
    const file = localPath(destination), parent = path.dirname(file);
    // Verify each existing parent before creating any missing directory.
    let current = root;
    for (const part of path.relative(root, parent).split(path.sep).filter(Boolean)) {
      current = path.join(current, part);
      try { if ((await lstat(current)).isSymbolicLink()) throw new Error("Output path cannot contain symbolic links."); }
      catch (error) { if (error instanceof Error && "code" in error && error.code === "ENOENT") await mkdir(current); else throw error; }
    }
    await writeFile(file, serialized, { flag: "wx", mode: 0o600 });
  }
  process.stdout.write(serialized);
}
try { await main(); }
catch (error) { console.error(error instanceof SyntaxError ? "Invalid JSON." : error instanceof Error ? error.message : "Dataset command failed."); process.exitCode = 1; }
