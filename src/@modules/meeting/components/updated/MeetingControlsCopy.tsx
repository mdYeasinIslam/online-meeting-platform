"use client";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefCallback,
} from "react";
import {
  useConnectionState,
  useLocalParticipant,
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { deviceMessage } from "@/src/@modules/livekit/errors";
import {
  LoaderCircle,
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";

export default function MeetingControlsCopy({
  starting,
  leaving,
  onLeave,
  signControl,
  endControlRef,
}: {
  starting: boolean;
  leaving: boolean;
  onLeave: () => void;
  signControl: ReactNode;
  endControlRef: RefCallback<HTMLDivElement>;
}) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } =
    useLocalParticipant();
  const state = useConnectionState();
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function toggle(device: "Camera" | "Microphone") {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError("");
    try {
      if (device === "Camera")
        await localParticipant.setCameraEnabled(
          !localParticipant.isCameraEnabled,
        );
      else
        await localParticipant.setMicrophoneEnabled(
          !localParticipant.isMicrophoneEnabled,
        );
    } catch (failure) {
      if (mounted.current) setError(deviceMessage(device, failure));
    } finally {
      lock.current = false;
      if (mounted.current) setPending(false);
      else
        for (const publication of localParticipant.trackPublications.values())
          publication.track?.stop();
    }
  }
  const disabled =
    starting || pending || leaving || state !== ConnectionState.Connected;
  return (
    <footer className="fixed bottom-4 left-1/2 z-40 max-w-[calc(100vw-1rem)] -translate-x-1/2 rounded-3xl border border-white/10 bg-[#24262d]/95 p-2 shadow-2xl backdrop-blur">
      <div className="flex flex-wrap items-center justify-center gap-2 sm:flex-nowrap sm:gap-3">
        <button
          title={isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"}
          aria-label={
            isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"
          }
          disabled={disabled}
          aria-pressed={isMicrophoneEnabled}
          onClick={() => void toggle("Microphone")}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${isMicrophoneEnabled ? "bg-[#3c4048] hover:bg-[#4a4e57]" : "bg-red-700 hover:bg-red-600"}`}
        >
          {/* {pending && (
            <LoaderCircle size={21} className="animate-spin" />
          )} */}
          {isMicrophoneEnabled ? <Mic size={21} /> : <MicOff size={21} />}
        </button>
        <button
          title={isCameraEnabled ? "Turn camera off" : "Turn camera on"}
          aria-label={isCameraEnabled ? "Turn camera off" : "Turn camera on"}
          disabled={disabled}
          aria-pressed={isCameraEnabled}
          onClick={() => void toggle("Camera")}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${isCameraEnabled ? "bg-[#3c4048] hover:bg-[#4a4e57]" : "bg-red-700 hover:bg-red-600"}`}
        >
          {isCameraEnabled ? <Video size={21} /> : <VideoOff size={21} />}
        </button>
        {signControl}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:flex-nowrap sm:gap-3">
          <button
            title="Leave meeting"
            aria-label={leaving ? "Leaving meeting" : "Leave meeting"}
            disabled={leaving}
            onClick={onLeave}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-red-700 transition-colors hover:bg-red-600 disabled:opacity-50"
          >
            {leaving ? (
              <LoaderCircle size={21} className="animate-spin" />
            ) : (
              <PhoneOff size={21} />
            )}
          </button>
          <div ref={endControlRef} className="contents" />
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-amber-200">
          {error}
        </p>
      )}
    </footer>
  );
}
