import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type * as tf from "@tensorflow/tfjs";
import { json, writeJSON } from "./data.ts";
import { validateContract, type inferenceContract } from "./contract.ts";
export async function compareBrowser(directory: string) {
  const target = path.join(directory, "export");
  const contract = await json(path.join(target, "inference-contract.json")) as ReturnType<typeof inferenceContract>;
  validateContract(contract); if (!contract.deployable) throw new Error("No selected real export available");
  const manifest = await json(path.join(target, "model.json")) as { modelTopology: object; weightsManifest: { weights: tf.io.WeightsManifestEntry[] }[] };
  const weights = (await readFile(path.join(target, "weights.bin"))).toString("base64");
  const fixture = await json(path.join(target, "comparison.json")) as { input: number[][][]; expected: number[][]; tolerance: number };
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : undefined) });
  try {
    const page = await browser.newPage(); await page.setContent("<p>Local temporal export comparison; no camera or meeting</p>");
    await page.addScriptTag({ path: "node_modules/@tensorflow/tfjs/dist/tf.min.js" });
    const actual = await page.evaluate(async ({ manifest, weights, input }) => {
      const runtime = (window as unknown as { tf: typeof tf }).tf;
      await runtime.setBackend("cpu"); await runtime.ready();
      const bytes = Uint8Array.from(atob(weights), character => character.charCodeAt(0));
      const model = await runtime.loadLayersModel(runtime.io.fromMemory({ modelTopology: manifest.modelTopology, weightSpecs: manifest.weightsManifest[0].weights, weightData: bytes.buffer }));
      try { return runtime.tidy(() => (model.predict(runtime.tensor3d(input)) as tf.Tensor).arraySync() as number[][]); } finally { model.dispose(); }
    }, { manifest, weights, input: fixture.input });
    const error = Math.max(...actual.flatMap((row, i) => row.map((value, j) => Math.abs(value - fixture.expected[i][j]))));
    if (!Number.isFinite(error) || error > fixture.tolerance) throw new Error(`Cross-runtime tolerance failed: ${error}`);
    const report = { comparison: "Node CPU vs Chromium TensorFlow.js CPU; validation samples only", maximumAbsoluteError: error, tolerance: fixture.tolerance, passed: true };
    await writeJSON(path.join(target, "cross-runtime.json"), report); return report;
  } finally { await browser.close(); }
}
