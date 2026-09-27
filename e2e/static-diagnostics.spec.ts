import { test, expect } from "@playwright/test";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import type { RecognitionStatus } from "../src/@modules/sign-recognition/config";
import { syntheticHand } from "../scripts/lib/static-probes";
import { extractFeatures } from "../src/@modules/sign-recognition/diagnostics";
import type { RankedClass } from "../src/@modules/sign-recognition/diagnostics";

test("top-five diagnostic component displays saved real-model synthetic probe output, separate from acceptance", async ({ page }) => {
  // Component rendering check, not a physical sign or detector integration test.
  const report = JSON.parse(readFileSync("docs/DAY-4.1-PROBES.json", "utf8"));
  const probe = report.probes.find((item: { group: string }) => item.group === "synthetic") as { winner: RankedClass; top5: RankedClass[]; probabilitySum: number };
  // Playwright rewrites imported JSX for component testing. Compile this repository
  // component with the actual React JSX runtime for the static DOM rendering check.
  const componentExports: { default?: ComponentType<{ status: RecognitionStatus; previewMirrored: boolean }> } = {};
  const source = readFileSync("src/@modules/sign-recognition/components/RecognitionDiagnostics.tsx", "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
  runInNewContext(compiled, { exports: componentExports, require: createRequire(`${process.cwd()}/package.json`) });
  if (!componentExports.default) throw new Error("Diagnostic component could not compile");
  const features = extractFeatures(syntheticHand(0, 0.4, 0.01));
  if ("error" in features) throw new Error(features.error);
  const markup = renderToStaticMarkup(createElement(componentExports.default, { previewMirrored: true, status: {
    phase: "unknown", rawLabel: probe.winner.label, confidence: probe.winner.probability,
    diagnostics: { detectedHands: 1, handedness: [{ side: "unknown" }], selectedHand: 0, landmarkCount: 21, handChanged: false, features: features.summary, top5: probe.top5, winnerIndex: probe.winner.index, finiteOutputs: true, probabilitySum: probe.probabilitySum },
    stabilization: { window: [], reason: "low-confidence", stable: false, threshold: 0.8 },
  } }));
  await page.setContent(markup);
  const panel = page.getByLabel("Recognition diagnostics", { exact: true });
  await expect(panel.getByRole("listitem")).toHaveCount(5);
  for (const [index, item] of probe.top5.entries()) await expect(panel.getByRole("listitem").nth(index)).toContainText(`${item.label} — ${(item.probability * 100).toFixed(2)}% (index ${item.index})`);
  await expect(panel).toContainText("low-confidence"); await expect(panel).toContainText("not sign accuracy");
});

test("real detector with synthetic camera shows no-hand diagnostics and stops without generating a letter", async ({ page, context }) => {
  test.skip(process.env.DAY2_LIVEKIT !== "1" && process.env.DAY4_CAMERA !== "1", "Requires synthetic browser camera flags.");
  test.setTimeout(120000);
  await context.grantPermissions(["camera", "microphone"]);
  const assets = new Map<string, number>();
  page.on("request", request => { const path = new URL(request.url()).pathname; if (path.startsWith("/model/")) assets.set(path, (assets.get(path) || 0) + 1); });
  await page.goto("/sign-demo");
  await expect(page.getByLabel("Recognition diagnostics", { exact: true })).toHaveCount(0);
  await page.getByLabel("Show local recognition diagnostics").check();
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  const panel = page.getByLabel("Recognition diagnostics", { exact: true });
  await expect(panel).toContainText("no-hand", { timeout: 90000 });
  await expect(panel).toContainText("No valid detection");
  await expect(panel).toContainText("yes (CSS only)");
  await expect(panel.getByRole("listitem")).toHaveCount(0);
  await expect(page.getByText("Raw prediction: —", { exact: true })).toBeVisible();
  await expect(page.getByText("Last accepted alphabet: —", { exact: true })).toBeVisible();
  await page.getByLabel("Show local recognition diagnostics").uncheck();
  await page.getByLabel("Show local recognition diagnostics").check();
  for (const path of ["/model/model.json", "/model/labels.json", "/model/group1-shard1of1.bin"]) expect(assets.get(path)).toBe(1);
  await page.getByRole("button", { name: "Stop camera", exact: true }).click();
  await expect(panel).toContainText("stopped");
  await expect.poll(() => page.locator("video").evaluateAll(elements => elements.every(video => !(video instanceof HTMLVideoElement) || !(video.srcObject instanceof MediaStream) || video.srcObject.getTracks().every(track => track.readyState === "ended")))).toBe(true);
  await expect(page.getByText("Raw prediction: —", { exact: true })).toBeVisible();
});
