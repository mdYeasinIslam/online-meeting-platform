"use client";
import { useState } from "react";
import type { MediaChoices } from "@/src/@modules/livekit/useMeetingConnection";

export default function PreJoin({ name, host, joining, onJoin }: {
  name: string; host: boolean; joining: boolean; onJoin: (choices: MediaChoices) => Promise<void>;
}) {
  const [microphone, setMicrophone] = useState(true);
  const [camera, setCamera] = useState(true);
  return <div className="rounded-xl bg-slate-900 p-6">
    <h2 className="text-xl font-semibold">Ready to join?</h2>
    <p className="my-3">{name} (you){host && " · Host"}</p>
    <p className="mb-4 text-sm text-slate-300">Your browser will request device access after you join. You can also join with both devices off.</p>
    <fieldset disabled={joining} className="flex flex-wrap gap-5">
      <label className="flex items-center gap-2"><input type="checkbox" checked={microphone} onChange={event => setMicrophone(event.target.checked)} />Microphone on when joining</label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={camera} onChange={event => setCamera(event.target.checked)} />Camera on when joining</label>
    </fieldset>
    <button disabled={joining} onClick={() => void onJoin({ microphone, camera })} className="mt-5 rounded bg-blue-700 px-5 py-3 disabled:opacity-50">{joining ? "Joining meeting…" : "Join meeting"}</button>
  </div>;
}
