"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/@libs/api/client";
import { Meeting } from "../../types";
import { Divider } from "antd";
export default function CreateMeetingFormCopy() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  //   async function submit(event: FormEvent<HTMLFormElement>) {
  //     event.preventDefault();
  //     setBusy(true);
  //     setError("");
  //     const title = String(new FormData(event.currentTarget).get("title") || "");
  //     try {
  //       const result = await api<{ meeting: Meeting }>("/meetings", {
  //         method: "POST",
  //         body: { title },
  //       });
  //       router.push(`/meeting/${result.meeting.roomId}`);
  //     } catch (error) {
  //       setError(
  //         error instanceof Error ? error.message : "Unable to create meeting.",
  //       );
  //     } finally {
  //       setBusy(false);
  //     }
  //   }
  async function submit() {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ meeting: Meeting }>("/meetings", {
        method: "POST",
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
    <div className="relative w-fit">
      <div
        role="menu"
        className="absolute left-0 top-full z-30 mt- min-w-full overflow-hidden rounded-xl bg-white text-sm shadow-xl"
      >

        
        <button
          //   href="/meeting/create"
          role="menuitem"
          onClick={submit}
          className="w-full block whitespace-nowrap rounded-lg px-4 py-3 font-semibold text-slate-700 transition hover:bg-(--color-primary-400)/20 hover:text-(--color-primary-500) cursor-pointer"
        >
          Create Instant Meeting
        </button>
        <Divider className="py-[0.1px] bg-black" />
        <button
          //   href="/meeting/create?later=true"
          role="menuitem"
          //   onClick={() => setIsCreateMenuOpen(false)}
          className="w-full block whitespace-nowrap rounded-lg px-4 py-3 font-semibold text-slate-700 transition hover:bg-(--color-primary-400)/20 hover:text-(--color-primary-500) cursor-pointer"
        >
          Create Meeting for later
        </button>
      </div>
      {/* <form onSubmit={submit} className="my-6 max-w-lg space-y-3">
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
      </form> */}
    </div>
  );
}
