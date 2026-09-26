"use client";
import { useState } from "react";
import { CAPTION_CONFIG, captionTextLength } from "../../captions/config";
import { RECOGNITION_MESSAGES } from "../config";
import type { SignComposerState } from "../useSignComposer";
export default function SignCaptionComposer({ composer, connected }: { composer: SignComposerState; connected: boolean }) {
  const [debug, setDebug] = useState(false);
  const text = composer.tokens.join("");
  return <section aria-label="Static sign recognition" className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
    <h2 className="text-lg font-semibold">Static Bangla alphabet prototype</h2>
    <p className="my-2 text-sm text-slate-300">This baseline recognizes isolated alphabets, not continuous words or sentences. Hold a sign steady; remove your hand briefly to repeat the same alphabet. Only Send caption shares your draft.</p>
    <p role="status" data-recognition-phase={composer.status.phase}>{RECOGNITION_MESSAGES[composer.status.phase]}</p>
    <p className="mt-3 text-sm text-slate-300">Local recognized draft · {captionTextLength(text)} / {CAPTION_CONFIG.maxTextCodePoints}</p>
    <output aria-label="Recognized draft" lang="bn" className="mt-1 block min-h-16 whitespace-pre-wrap break-words rounded bg-slate-800 p-3 text-xl">{text || "—"}</output>
    <div className="mt-3 flex flex-wrap gap-2">
      <button disabled={!text || composer.sending} onClick={composer.backspace} className="rounded border px-3 py-2 disabled:opacity-50">Remove last token</button>
      <button disabled={!text || composer.sending} onClick={composer.clear} className="rounded border px-3 py-2 disabled:opacity-50">Clear draft</button>
      <button disabled={!text || composer.sending || !connected} onClick={() => void composer.send()} className="rounded bg-emerald-700 px-3 py-2 disabled:opacity-50">{composer.sending ? "Sending…" : "Send caption"}</button>
    </div>
    {composer.error && <p role="alert" className="mt-2 text-amber-200">{composer.error}</p>}
    {composer.sent && <p role="status" className="mt-2">Caption sent. Only participants connected at send time can receive it.</p>}
    <p className="mt-3 text-xs text-slate-300">Camera off or a lost connection pauses inference. Recognition resumes automatically when the camera and connection return while recognition is enabled. Stop sign recognition keeps your camera on.</p>
    <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={debug} onChange={event => setDebug(event.target.checked)} />Show local recognition diagnostics</label>
    {debug && <dl className="mt-2 grid grid-cols-2 gap-1 text-sm" aria-label="Recognition diagnostics"><dt>Model state</dt><dd>{composer.status.phase}</dd><dt>Raw label</dt><dd lang="bn">{composer.status.rawLabel || "—"}</dd><dt>Confidence</dt><dd>{composer.status.confidence === undefined ? "—" : `${(composer.status.confidence * 100).toFixed(1)}%`}</dd><dt>Last accepted label</dt><dd lang="bn">{composer.status.acceptedLabel || "—"}</dd><dt>Last frame pipeline latency</dt><dd>{composer.status.inferenceMs?.toFixed(1) ?? "—"} ms</dd><dt>Effective inference FPS</dt><dd>{composer.status.effectiveFps?.toFixed(1) ?? "—"}</dd></dl>}
  </section>;
}
