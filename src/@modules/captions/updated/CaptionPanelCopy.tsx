"use client";
import { useEffect, useRef, useState } from "react";
import { CAPTION_CONFIG } from "../config";
import type { CaptionItem } from "../types";
export default function CaptionPanelCopy({ captions, localParticipantId }: { captions: readonly CaptionItem[]; localParticipantId?: string }) {
  const scrollRef = useRef<HTMLOListElement>(null);
  const [following, setFollowing] = useState(true);
  const [seenId, setSeenId] = useState<string | undefined>();
  const lastId = captions.at(-1)?.id;
  useEffect(() => {
    const list = scrollRef.current;
    if (list && following) list.scrollTop = list.scrollHeight;
  }, [lastId, following]);
  const newCaptions = !following && lastId !== seenId;
  function scrollToLatest() {
    setFollowing(true);
    const list = scrollRef.current;
    if (list) list.scrollTop = list.scrollHeight;
    setSeenId(lastId);
  }
  return <section className="mt-4 border-t border-white/10 pt-3" aria-label="Shared sign and speech captions">
    <details>
    <summary className="cursor-pointer text-sm font-medium text-slate-200">Shared captions ({captions.length})</summary>
    <p className="my-2 text-xs text-slate-400">Confirmed captions from participants. Earlier captions are not sent to late joiners.</p>
    <ol ref={scrollRef} onScroll={() => {
      const list = scrollRef.current;
      if (list) { setFollowing(list.scrollHeight - list.scrollTop - list.clientHeight <= CAPTION_CONFIG.scrollThresholdPx); setSeenId(lastId); }
    }} role="log" aria-live="polite" aria-relevant="additions" className="mt-3 max-h-48 space-y-3 overflow-y-auto">
      {captions.map(item => <li key={item.id} data-caption-id={item.id} className="break-words rounded bg-slate-800 p-3"><strong>{item.participantName}{item.participantId === localParticipantId && " (you)"}</strong><span className="ml-2 text-xs text-slate-300">{item.source === "sign" ? "Sign" : "Speech"}</span><time dateTime={new Date(item.timestamp).toISOString()} className="ml-2 text-xs text-slate-300">{new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time><p lang="bn" className="mt-2 whitespace-pre-wrap text-lg">{item.text}</p></li>)}
    </ol>
    {!captions.length && <p className="mt-3 text-sm text-slate-400">No confirmed captions yet.</p>}
    {newCaptions && <button onClick={scrollToLatest} className="mt-2 rounded border px-3 py-2 text-sm">New captions — scroll to latest</button>}
    </details>
  </section>;
}
