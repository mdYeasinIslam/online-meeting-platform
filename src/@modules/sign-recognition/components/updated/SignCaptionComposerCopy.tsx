"use client";

import { useState } from "react";
import { Check, Eraser, LoaderCircle, Send, Undo2 } from "lucide-react";
import { CAPTION_CONFIG, captionTextLength } from "@/src/@modules/captions/config";
import { RECOGNITION_MESSAGES } from "@/src/@modules/sign-recognition/config";
import type { SignComposerState } from "@/src/@modules/sign-recognition/useSignComposer";

export default function SignCaptionComposerCopy({ composer, connected }: { composer: SignComposerState; connected: boolean }) {
  const [debug, setDebug] = useState(false);
  const text = composer.tokens.join("");
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4" aria-label="Sign message draft">
      <div>
        <h2 className="text-lg font-semibold">Your sign message</h2>
        <p className="mt-1 text-sm text-slate-400">Recognized text stays private until you send it as a caption.</p>
      </div>
      <div role="status" data-recognition-phase={composer.status.phase} className="flex items-center gap-2 rounded-lg bg-[#24262d] p-3 text-sm text-slate-200">
        {composer.status.phase === "loading-mediapipe" || composer.status.phase === "loading-model" ? <LoaderCircle size={17} className="animate-spin" /> : null}
        {RECOGNITION_MESSAGES[composer.status.phase]}
      </div>
      <div className="rounded-xl border border-white/10 bg-[#20232b] p-4">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>Local draft</span>
          <span>{captionTextLength(text)} / {CAPTION_CONFIG.maxTextCodePoints}</span>
        </div>
        <output aria-label="Recognized Bangla draft" lang="bn" className="block min-h-28 whitespace-pre-wrap break-words text-2xl leading-relaxed">
          {text || <span className="text-slate-500">Show a supported alphabet sign to begin…</span>}
        </output>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button disabled={!text || composer.sending} onClick={composer.backspace} className="flex items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-40"><Undo2 size={16} /> Remove last</button>
        <button disabled={!text || composer.sending} onClick={composer.clear} className="flex items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-40"><Eraser size={16} /> Clear</button>
      </div>
      <button disabled={!text || composer.sending || !connected} onClick={() => void composer.send()} className="flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-3 font-medium hover:bg-emerald-500 disabled:opacity-40">
        {composer.sending ? <LoaderCircle size={18} className="animate-spin" /> : composer.sent ? <Check size={18} /> : <Send size={18} />}
        {composer.sending ? "Sending caption…" : composer.sent ? "Caption sent" : "Send confirmed caption"}
      </button>
      {composer.error && <p role="alert" className="text-sm text-amber-300">{composer.error}</p>}
      <p className="text-xs leading-relaxed text-slate-400">This model recognizes supported static alphabets, not continuous words or sentences. Turning the camera off pauses recognition; turning it back on resumes it while recognition remains enabled.</p>
      <details className="text-xs text-slate-400">
        <summary className="cursor-pointer">Recognition diagnostics</summary>
        <p className="mt-2">Phase: {composer.status.phase}{composer.status.acceptedLabel ? ` · Accepted: ${composer.status.acceptedLabel}` : ""}{composer.status.confidence !== undefined ? ` · Confidence: ${composer.status.confidence.toFixed(2)}` : ""}</p>
        <label className="mt-3 flex items-center gap-2"><input type="checkbox" checked={debug} onChange={(event) => setDebug(event.target.checked)} />Show technical detail</label>
        {debug && composer.status.diagnostics && <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(composer.status.diagnostics, null, 2)}</pre>}
      </details>
    </section>
  );
}
