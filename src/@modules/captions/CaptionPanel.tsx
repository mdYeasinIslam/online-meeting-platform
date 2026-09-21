import type { CaptionItem } from "./types";
export default function CaptionPanel({ captions }: { captions: readonly CaptionItem[] }) {
  return <aside className="min-h-64 rounded-xl border border-slate-700 bg-slate-900 p-4" aria-label="Live conversation"><h2 className="text-xl font-semibold">Live conversation</h2><p className="my-2 text-sm text-slate-400">Bangla sign and speech captions will appear here.</p><ol role="log" aria-live="polite" aria-relevant="additions" className="max-h-96 space-y-4 overflow-y-auto">{captions.map(item => <li key={item.id}><strong>{item.participantName}</strong><span className="ml-2 text-xs text-slate-400">{item.source}</span><p lang="bn">{item.text}</p></li>)}</ol>{!captions.length && <p className="mt-8 text-slate-400">No captions yet.</p>}</aside>;
}
