"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/src/@libs/api/client";
import { useAuth } from "@/src/@modules/auth/context/AuthProvider";
import CreateMeetingForm from "./CreateMeetingForm";
import CopyInviteButton from "./CopyInviteButton";
import type { MeetingList } from "../types";
export default function Dashboard() {
  const { user } = useAuth(); const [page, setPage] = useState(1); const [retry, setRetry] = useState(0);
  const [data, setData] = useState<MeetingList | null>(null); const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void api<MeetingList>(`/meetings?page=${page}`, { signal: controller.signal }).then(setData).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Unable to load meetings."); });
    return () => controller.abort();
  }, [page, retry]);
  return <section className="mx-auto max-w-5xl p-6"><h1 className="text-3xl font-bold">Your meetings</h1><p className="mt-3">Welcome, {user?.displayName}.</p><CreateMeetingForm />
    <h2 className="text-xl font-semibold">Meetings you host</h2>
    {error ? <div role="alert" className="my-4"><p>{error}</p><button className="mt-2 rounded border p-2" onClick={() => { setError(""); setData(null); setRetry(value => value + 1); }}>Retry</button></div> : !data ? <p role="status" className="my-4">Loading meetings…</p> : <>
      {!data.meetings.length && <p className="my-4 text-slate-400">No meetings on this page. Create a meeting to get an invitation link.</p>}
      <ul className="my-4 space-y-3">{data.meetings.map(meeting => <li key={meeting.roomId} className="flex flex-wrap justify-between gap-4 rounded-xl border border-slate-700 p-4"><div><Link className="font-semibold underline" href={`/meeting/${meeting.roomId}`}>{meeting.title}</Link><p className="mt-1 text-sm text-slate-400">{meeting.status} · Up to {meeting.maxParticipants} participants</p></div><CopyInviteButton roomId={meeting.roomId} /></li>)}</ul>
      <div className="flex gap-4"><button disabled={page === 1} onClick={() => { setData(null); setPage(value => value - 1); }} className="disabled:opacity-40">Previous</button><span>Page {page}</span><button disabled={!data.hasMore} onClick={() => { setData(null); setPage(value => value + 1); }} className="disabled:opacity-40">Next</button></div>
    </>}
  </section>;
}
