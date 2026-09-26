"use client";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/src/@libs/api/client";
import { parseMeetingInput } from "../join-input";
import type { Meeting } from "../types";

export default function JoinMeetingForm() {
  const router = useRouter();
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [signIn, setSignIn] = useState("");

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);
  useEffect(() => () => request.current?.abort(), []);

  function close() {
    request.current?.abort();
    request.current = null;
    setBusy(false);
    setError("");
    setSignIn("");
    setOpen(false);
    trigger.current?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current) return;
    setError("");
    setSignIn("");
    const parsed = parseMeetingInput(value);
    if (parsed.error !== undefined) {
      setError(parsed.error);
      input.current?.focus();
      return;
    }
    const destination = `/meeting/${parsed.roomId}`;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    try {
      const { meeting } = await api<{ meeting: Meeting }>(
        `/meetings/${parsed.roomId}`,
        {
          signal: controller.signal,
          // The global expired-session handler would return to the dashboard.
          // Instead show a sign-in link carrying this intended meeting route.
          notifyExpired: false,
        },
      );
      if (controller.signal.aborted) return;
      if (!meeting || meeting.roomId !== parsed.roomId)
        throw new Error("Invalid meeting response");
      if (meeting.status === "ended") throw new ApiError(410, "Meeting ended");
      if (meeting.status !== "active")
        throw new Error("Invalid meeting status");
      router.push(destination);
      // Keep the lock until navigation unmounts the form (or the user cancels).
      return;
    } catch (failure) {
      if (controller.signal.aborted) return;
      const status = failure instanceof ApiError ? failure.status : undefined;
      if (status === 401) {
        setError(
          "Your session has expired. Sign in again to join this meeting.",
        );
        setSignIn(`/auth?next=${encodeURIComponent(destination)}`);
      } else {
        setError(
          status === 404
            ? "Meeting not found. Check the invitation and try again."
            : status === 410
              ? "This meeting has ended and can no longer be joined."
              : status === 400
                ? "Enter a valid meeting link or ID copied from an invitation."
                : status === 0 || (status !== undefined && status >= 500)
                  ? "Cannot reach the meeting service. Please try again shortly."
                  : "Unable to check this meeting. Please try again.",
        );
      }
      request.current = null;
      setBusy(false);
    }
  }

  return (
    <div className="my-6 min-w-0 ">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => (open ? close() : setOpen(true))}
        className="rounded bg-blue-700 p-3 mb-3"
      >
        Join meeting
      </button>
      {open && (
        <section
          id={`${id}-panel`}
          aria-labelledby={`${id}-title`}
          // className="absolute top-1/4 left-[30%] mt-3 min-w-0 rounded-xl border border-slate-700 bg-slate-900 p-4"
          className={`${
            open ? " scale-[1] opacity-100 " : " scale-[0] opacity-0 "
          } w-full h-screen fixed top-0 left-0 z-20 dark:bg-black/40 bg-[#0000002a] flex items-center justify-center transition-all duration-300`}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              close();
            }
          }}
        >
          <div
            className={`w-[90%] md:w-[30%] dark:bg-slate-800 bg-secondary rounded-lg p-4`}
          >
            <h2 id={`${id}-title`} className="text-xl font-semibold">
              Join a meeting
            </h2>
            <form
              onSubmit={submit}
              noValidate
              className="mt-3 space-y-3"
              aria-busy={busy}
            >
              <label htmlFor={`${id}-input`} className="block">
                Meeting link or ID
              </label>
              <input
                ref={input}
                id={`${id}-input`}
                type="text"
                value={value}
                readOnly={busy}
                onChange={(event) => {
                  setValue(event.target.value);
                  setError("");
                  setSignIn("");
                }}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Paste a meeting link or enter a meeting ID"
                aria-invalid={Boolean(error)}
                aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
                className="block w-full min-w-0 rounded border p-3"
              />
              <p id={`${id}-help`} className="text-sm text-slate-300">
                Paste the full invite link, its /meeting/ path, or the meeting
                ID from the link.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  disabled={busy || Boolean(signIn)}
                  className="rounded bg-blue-700 p-3 disabled:opacity-50"
                >
                  {busy ? "Checking meeting…" : "Join meeting"}
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="rounded border p-3"
                >
                  Cancel
                </button>
              </div>
              <p role="status" className="text-sm">
                {busy ? "Checking meeting…" : ""}
              </p>
              {error && (
                <p id={`${id}-error`} role="alert" className="text-amber-200">
                  {error}
                </p>
              )}
              {/* Full navigation rechecks the expired session before the auth page renders. */}
              {signIn && (
                <a href={signIn} className="inline-block underline">
                  Sign in to join this meeting
                </a>
              )}
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
