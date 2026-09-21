"use client";
import { useState } from "react";
export default function CopyInviteButton({ roomId }: { roomId: string }) {
  const [message, setMessage] = useState("");
  async function copy() {
    const url = `${window.location.origin}/meeting/${roomId}`;
    try { await navigator.clipboard.writeText(url); setMessage("Invite link copied."); }
    catch { setMessage(`Copy this link: ${url}`); }
  }
  return <div><button onClick={copy} className="rounded border px-3 py-2">Copy invite link</button><p role="status" className="mt-1 break-all text-sm">{message}</p></div>;
}
