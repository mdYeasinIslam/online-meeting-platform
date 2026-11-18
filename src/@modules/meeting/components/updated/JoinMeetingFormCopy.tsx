import {
  useId,
  useRef,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
} from "react";
import { parseMeetingInput } from "../../join-input";
import { api, ApiError } from "@/src/@libs/api/client";
import { useRouter } from "next/navigation";
import { Meeting } from "../../types";

export interface JoinMeetingFormCopyProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "value" | "defaultValue" | "onChange" | "type"
> {
  /** Called with the email address when the form is submitted. */
  onJoinMeeting?: (email: string) => void;
  /** Accessible name for the field. */
  label?: string;
  buttonLabel?: string;
  className?: string;
}

/** An email field with a subscribe button, for newsletter or membership sign-ups. */
const JoinMeetingFormCopy = ({
  onJoinMeeting,
  label = "Email address",
  buttonLabel = "Join Meeting",
  placeholder = "Enter meeting link",
  className = "",
  ...props
}: JoinMeetingFormCopyProps) => {
  const [email, setEmail] = useState("");
  const router = useRouter();
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);

  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [signIn, setSignIn] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
      // onJoinMeeting?.(email.trim());
      console.log(request.current)
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
      if (meeting.status === "ended" || meeting.status === "ending")
        throw new ApiError(
          410,
          "Meeting unavailable",
          meeting.status === "ending" ? "MEETING_ENDING" : "MEETING_ENDED",
        );
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
              ? failure instanceof ApiError && failure.code === "MEETING_ENDING"
                ? "This meeting is ending and cannot be joined."
                : "This meeting has ended. You can no longer join using this meeting link."
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
  };

  return (
    <form onSubmit={handleSubmit} className={`w-full relative`}>
      <input
        // type="text"
        // required
        // ref={input}
        // autoComplete="email"
        // aria-label={label}
        // placeholder={placeholder}
        // value={email}
        // onChange={(event) => setEmail(event.target.value)}
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
        placeholder="Paste a meeting link or ID"
        aria-invalid={Boolean(error)}
        aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
        className="border bg-transparent dark:border-slate-500 dark:placeholder:text-slate-500 dark:text-[#abc2d3] border-[#e5eaf2] py-2 pl-4 pr-14 lg:pr-[115px] outline-none w-full rounded-md "
        // {...props}
      />
      <button
        type="submit"
        //   onClick={()=>setValue('')}
        disabled={busy || Boolean(signIn)}
        className="absolute top-0 right-0 h-full bg-(--color-primary-400) text-white font-semibold px-3   rounded-md cursor-pointer hover:bg-white hover:text-black transition-all duration-100 ease-in"
      >
        {/* {buttonLabel} */}
        {busy ? "Checking meeting…" : "Join "}
      </button>
    </form>
  );
};
export default JoinMeetingFormCopy;
