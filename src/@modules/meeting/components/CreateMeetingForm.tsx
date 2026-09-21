"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/@libs/api/client";
import type { Meeting } from "../types";
export default function CreateMeetingForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const title = String(new FormData(event.currentTarget).get("title") || "");
    try {
      const result = await api<{ meeting: Meeting }>("/meetings", {
        method: "POST",
        body: { title },
      });
      router.push(`/meeting/${result.meeting.roomId}`);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to create meeting.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="my-6 max-w-lg space-y-3">
      <label className="block">
        Meeting title (optional)
        <input
          disabled={busy}
          name="title"
          maxLength={120}
          className="mt-2 w-full rounded border p-3"
          placeholder="Thesis demonstration"
        />
      </label>
      <button
        disabled={busy}
        className="rounded bg-emerald-700 p-3 disabled:opacity-50 cursor-pointer"
      >
        {busy ? "Creating…" : "Create meeting"}
      </button>
      <p role="alert" className="text-amber-200">
        {error}
      </p>
    </form>
  );
}
