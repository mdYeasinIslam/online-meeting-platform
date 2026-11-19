"use client";
import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "@/src/@libs/api/client";
import {
  meetingApprovalRequestCopy,
  type JoinRequestCopy,
} from "./meeting-approval-clientCopy";

export default function JoinRequestPanelCopy({ roomId }: { roomId: string }) {
  const [requests, setRequests] = useState<JoinRequestCopy[]>([]);
  const [error, setError] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const data = await meetingApprovalRequestCopy<{
        requests: JoinRequestCopy[];
      }>(roomId, "/pending");
      setRequests(data.requests);
      setError("");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to load join requests.",
      );
    }
  }, [roomId]);
  useEffect(() => {
    const events = new EventSource(
      `${API_BASE_URL}/meetings/${encodeURIComponent(roomId)}/join-requests/events`,
      { withCredentials: true },
    );
    events.addEventListener("open", () => {
      void refresh();
    });
    events.addEventListener("update", () => {
      void refresh();
    });
    events.addEventListener("error", () => {
      void refresh();
    });
    return () => events.close();
  }, [roomId, refresh]);
  async function decide(requestId: string, decision: "accept" | "reject") {
    if (decision === "reject") setIsRejecting(true);
    else setIsAccepting(true);
    try {
      await meetingApprovalRequestCopy(
        roomId,
        `/${encodeURIComponent(requestId)}/${decision}`,
        { method: "POST" },
      );
      await refresh();
      if (decision === "reject") setIsRejecting(false);
      else setIsAccepting(false);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to update request.",
      );
    }
  }
  if (!requests.length && !error) return null;
  return (
    <section
      aria-label=" Waiting room"
      className="mb-3 rounded-2xl border border-white/10 bg-slate-900/90 p-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Waiting room</h2>
        <span className="rounded-full bg-blue-500/15 px-2 py-1 text-xs text-blue-200">
          {requests.length} waiting
        </span>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-amber-200">
          {error}
        </p>
      )}
      {!requests.length && !error && (
        <p className="mt-3 text-sm text-slate-400">
          New join requests will appear here.
        </p>
      )}
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {requests.map((request) => (
          <li
            key={request.id}
            className="flex items-center justify-between gap-3 rounded-xl bg-white/5 p-3"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{request.displayName}</p>
              <p className="text-xs text-slate-400">
                {request.participantType === "guest"
                  ? "Guest"
                  : "Authenticated"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm cursor-pointer"
                onClick={() => void decide(request.id, "accept")}
              >
                {isAccepting ? "Accepting…" : "Accept"}
              </button>
              <button
                className="rounded-lg border border-white/15 px-3 py-2 text-sm cursor-pointer"
                onClick={() => void decide(request.id, "reject")}
              >
                {isRejecting ? "Rejecting…" : "Reject"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
