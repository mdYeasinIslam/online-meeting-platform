"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/src/@libs/api/client";
import type { Meeting } from "../types";

export default function EndMeetingControl({ roomId, onEnded, visible = true, triggerContainer }: { roomId: string; onEnded: () => void; visible?: boolean; triggerContainer?: HTMLElement | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const controller = useRef<AbortController | null>(null);
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const id = useId();
  useEffect(() => () => controller.current?.abort(), []);
  function close() { if (!pendingRef.current) { dialog.current?.close(); trigger.current?.focus(); } }
  async function confirm() {
    if (pendingRef.current) return;
    pendingRef.current = true; setPending(true); setError("");
    const request = new AbortController(); controller.current = request;
    try {
      const result = await api<{ meeting: Meeting }>(`/meetings/${roomId}/end`, { method: "POST", body: {}, signal: request.signal });
      if (request.signal.aborted) return;
      if (result.meeting.status !== "ended") throw new Error("Shutdown is not confirmed. Please retry.");
      dialog.current?.close(); onEnded();
    } catch (failure) {
      if (!request.signal.aborted) setError(failure instanceof Error ? failure.message : "Could not confirm shutdown. Please retry.");
    } finally {
      pendingRef.current = false;
      if (!request.signal.aborted) setPending(false);
    }
  }
  const triggerButton = visible ? <button ref={trigger} className="rounded border border-red-500 bg-red-950 p-3 text-red-100" onClick={() => { setError(""); dialog.current?.showModal(); cancel.current?.focus(); }}>End meeting for everyone</button> : null;
  // Keep the dialog mounted while the connected controls disappear during shutdown.
  return <>
    {triggerContainer === undefined ? triggerButton : triggerContainer ? createPortal(triggerButton, triggerContainer) : null}
    <dialog ref={dialog} aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onCancel={event => { event.preventDefault(); close(); }} className="m-auto w-[min(90vw,30rem)] rounded-xl border border-slate-600 bg-slate-900 p-6 text-white backdrop:bg-black/70">
      <h2 id={`${id}-title`} className="text-xl font-bold">End meeting for everyone?</h2>
      <p id={`${id}-description`} className="my-4">All participants will be disconnected, and this meeting link cannot be used again.</p>
      {error && <p role="alert" className="my-3 text-amber-200">{error}</p>}
      {pending && <p role="status">Ending meeting…</p>}
      <div className="flex justify-end gap-3">
        <button ref={cancel} disabled={pending} onClick={close} className="rounded border px-4 py-2 disabled:opacity-50">Cancel</button>
        <button disabled={pending} onClick={() => void confirm()} className="rounded bg-red-700 px-4 py-2 disabled:opacity-50">{pending ? "Ending…" : "End meeting"}</button>
      </div>
    </dialog>
  </>;
}
