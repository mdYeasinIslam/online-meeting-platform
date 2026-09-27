"use client";
import type { RecognitionStatus } from "../config";
/** Opt-in local display. No storage, raw landmark export, logging or inference controls. */
export default function RecognitionDiagnostics({ status, previewMirrored }: { status: RecognitionStatus; previewMirrored: boolean }) {
  const diagnostic = status.diagnostics, stable = status.stabilization;
  const percent = (value?: number) => value === undefined ? "—" : `${(value * 100).toFixed(2)}%`;
  return <div aria-label="Recognition diagnostics" className="mt-3 space-y-3 text-sm">
    <p>Technical observations only; not sign accuracy. Training label order, handedness and mirroring policy are unverified.</p>
    <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2 break-words">
      <dt>Model state</dt><dd>{status.phase}</dd>
      <dt>Detected hands</dt><dd>{diagnostic?.detectedHands ?? "—"}</dd>
      <dt>Assigned handedness / confidence</dt><dd>{diagnostic?.handedness.map((hand, index) => `${index}: ${hand.side} (${percent(hand.confidence)}; ${hand.landmarkCount ?? "—"} landmarks)`).join("; ") || "—"} · raw MediaPipe labels, not verified physical sides</dd>
      <dt>Selected hand index / landmarks</dt><dd>{diagnostic?.selectedHand ?? "none"} / {diagnostic?.landmarkCount ?? 0}</dd>
      <dt>Selected hand continuity reset</dt><dd>{diagnostic?.handChanged ? "yes" : "no"}</dd>
      <dt>Preview mirrored</dt><dd>{previewMirrored ? "yes (CSS only)" : "no"}</dd>
      <dt>Data coordinates mirrored</dt><dd>no application transform</dd>
      <dt>Camera dimensions / readyState</dt><dd>{status.frame ? `${status.frame.width} × ${status.frame.height} / ${status.frame.readyState}` : "—"}</dd>
      <dt>Frame timestamp / target FPS</dt><dd>{status.frame ? `${status.frame.timestamp} / ${status.frame.targetFps}` : "—"}</dd>
      <dt>Feature validity</dt><dd>{diagnostic?.featureError || (diagnostic?.features ? "Valid features" : "No valid detection")}</dd>
      <dt>Feature length / min / max / mean / scale</dt><dd>{diagnostic?.features ? [diagnostic.features.length, diagnostic.features.min, diagnostic.features.max, diagnostic.features.mean, diagnostic.features.scale].map(value => Number(value.toPrecision(5))).join(" / ") : "—"}</dd>
      <dt>Raw winner index / label</dt><dd lang="bn">{diagnostic?.winnerIndex ?? "—"} / {status.rawLabel || "—"}</dd>
      <dt>Confidence / threshold passed</dt><dd>{percent(status.confidence)} / {status.confidence === undefined ? "—" : status.confidence >= (stable?.threshold ?? 0.8) ? "yes" : "no"}</dd>
      <dt>Probability sum / finite outputs</dt><dd>{diagnostic?.probabilitySum?.toFixed(6) ?? "—"} / {diagnostic?.finiteOutputs === undefined ? "—" : diagnostic.finiteOutputs ? "yes" : "no"}{diagnostic?.outputError && ` · ${diagnostic.outputError}`}</dd>
      <dt>Stabilizer window</dt><dd lang="bn">{stable?.window.join(" · ") || "empty"}</dd>
      <dt>Stable / acceptance or suppression</dt><dd>{stable?.stable ? "yes" : "no"} / {stable?.reason ?? "reset"}</dd>
      <dt>Last accepted label (history)</dt><dd lang="bn">{status.acceptedLabel || "—"}</dd>
      <dt>Model inference / full pipeline latency</dt><dd>{diagnostic?.inferenceMs?.toFixed(2) ?? "—"} / {status.inferenceMs?.toFixed(2) ?? "—"} ms</dd>
      <dt>Effective inference FPS</dt><dd>{status.effectiveFps?.toFixed(2) ?? "—"}</dd>
    </dl>
    <p>Raw top-5 probabilities {diagnostic?.top5 ? "(valid model output)" : "unavailable — no valid model output"}</p>
    {diagnostic?.top5 && <ol aria-label="Raw top five predictions" className="list-inside list-decimal">{diagnostic.top5.map(item => <li key={item.index}><span lang="bn">{item.label}</span> — {percent(item.probability)} (index {item.index})</li>)}</ol>}
  </div>;
}
