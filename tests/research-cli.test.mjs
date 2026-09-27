import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { sample, vocabulary } from "./helpers/research-fixture.mjs";
const cli = fileURLToPath(new URL("../scripts/dataset.mts", import.meta.url));
test("CLI validates synthetic files, reports true statistics, splits deterministically and rejects unsafe paths", () => {
  const directory = mkdtempSync(join(tmpdir(), "day4-cli-"));
  const run = (...args) => spawnSync(process.execPath, ["--experimental-strip-types", cli, ...args, "--vocabulary", "vocabulary.json"], { cwd: directory, encoding: "utf8" });
  try {
    writeFileSync(join(directory, "vocabulary.json"), JSON.stringify(vocabulary()));
    mkdirSync(join(directory, "raw"));
    const empty = run("stats", "--input", "raw", "--seed", "a");
    assert.equal(empty.status, 0, empty.stderr); assert.equal(JSON.parse(empty.stdout).statistics.totalSamples, 0);
    assert.equal(run("split", "--input", "raw", "--seed", "a").status, 1);
    for (let i = 1; i <= 9; i++) writeFileSync(join(directory, "raw", `${i}.json`), JSON.stringify(sample(i, `P${String(i).padStart(3, "0")}`)));
    const valid = run("validate", "--input", "raw"); assert.equal(valid.status, 0, valid.stderr); assert.equal(JSON.parse(valid.stdout).statistics.totalSamples, 9);
    const a = run("split", "--input", "raw", "--seed", "a"); assert.equal(a.status, 0, a.stderr);
    assert.equal(a.stdout, run("split", "--input", "raw", "--seed", "a").stdout);
    assert.equal(JSON.parse(a.stdout).leakage, false);
    assert.equal(run("stats", "--input", "raw", "--output", "reports/result.json").status, 0);
    assert.equal(run("stats", "--input", "raw", "--output", "reports/result.json").status, 1); // no overwrite
    assert.equal(run("stats", "--input", "../outside").status, 1);
    symlinkSync(join(directory, "raw"), join(directory, "alias"));
    assert.equal(run("stats", "--input", "alias").status, 1);
    const invalid = sample(10); invalid.frames[0].left.landmarks[0].x = 100;
    writeFileSync(join(directory, "raw", "invalid.json"), JSON.stringify(invalid));
    const rejected = run("validate", "--input", "raw"); assert.equal(rejected.status, 1); assert.equal(JSON.parse(rejected.stdout).statistics.rejected, 1);
    assert.equal(run("split", "--input", "raw", "--seed", "a").status, 1);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
