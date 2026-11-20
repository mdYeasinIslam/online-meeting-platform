"use client";

import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Settings,
  AlertCircle,
  Loader2,
  User,
} from "lucide-react";
import type { MediaChoices } from "@/src/@modules/livekit/useMeetingConnection";
import { cn } from "@/src/@libs/utils/cn";

// Extended choices type so existing MediaChoices ({ microphone, camera }) remains 100% compatible
export type PreJoinMediaChoices = MediaChoices & {
  audioDeviceId?: string;
  videoDeviceId?: string;
};

export default function PreJoinCopy({
  name,
  host,
  joining,
  onJoin,
}: {
  name: string;
  host: boolean;
  joining: boolean;
  onJoin: (choices: PreJoinMediaChoices) => Promise<void>;
}) {
  // Preserved original states
  const [microphone, setMicrophone] = useState(true);
  const [camera, setCamera] = useState(true);

  // New Google Meet pre-check states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string>("");
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [deviceError, setDeviceError] = useState<string>("");
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Helper to stop active preview stream and audio analyzer cleanly
  function stopPreviewMedia() {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setAudioLevel(0);
  }

  // Start / restart preview stream when selected device IDs change
  useEffect(() => {
    let cancelled = false;

    async function initDevicesAndPreview() {
      setIsInitializing(true);
      setDeviceError("");
      stopPreviewMedia();

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Camera and microphone are not supported in this browser.",
          );
        }

        const constraints: MediaStreamConstraints = {
          video: selectedVideoId
            ? { deviceId: { exact: selectedVideoId } }
            : true,
          audio: selectedAudioId
            ? { deviceId: { exact: selectedAudioId } }
            : true,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        // Sync initial enabled state with toggle buttons
        stream.getVideoTracks().forEach((t) => (t.enabled = camera));
        stream.getAudioTracks().forEach((t) => (t.enabled = microphone));

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Enumerate devices now that permission is granted (so device labels appear)
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) {
          const mics = devices.filter((d) => d.kind === "audioinput");
          const cams = devices.filter((d) => d.kind === "videoinput");
          setAudioDevices(mics);
          setVideoDevices(cams);

          if (!selectedAudioId && mics[0]?.deviceId) {
            setSelectedAudioId(mics[0].deviceId);
          }
          if (!selectedVideoId && cams[0]?.deviceId) {
            setSelectedVideoId(cams[0].deviceId);
          }
        }

        // Setup Web Audio API volume meter for mic check
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          const AudioCtx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext;
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;

          const source = audioCtx.createMediaStreamSource(
            new MediaStream([audioTrack]),
          );
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const updateMeter = () => {
            if (cancelled) return;
            if (!audioTrack.enabled) {
              setAudioLevel(0);
            } else {
              analyser.getByteFrequencyData(dataArray);
              const avg =
                dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
              setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
            }
            animFrameRef.current = requestAnimationFrame(updateMeter);
          };
          updateMeter();
        }
      } catch (err) {
        if (!cancelled) {
          setDeviceError(
            err instanceof Error
              ? err.message
              : "Could not access camera or microphone. You can still join with devices off.",
          );
          setCamera(false);
          setMicrophone(false);
        }
      } finally {
        if (!cancelled) {
          setIsInitializing(false);
        }
      }
    }

    void initDevicesAndPreview();

    return () => {
      cancelled = true;
      stopPreviewMedia();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAudioId, selectedVideoId]);

  // Toggle video track live without tearing down stream
  function handleToggleCamera() {
    const nextState = !camera;
    setCamera(nextState);
    if (streamRef.current) {
      streamRef.current
        .getVideoTracks()
        .forEach((t) => (t.enabled = nextState));
    }
  }

  // Toggle audio track live without tearing down stream
  function handleToggleMicrophone() {
    const nextState = !microphone;
    setMicrophone(nextState);
    if (streamRef.current) {
      streamRef.current
        .getAudioTracks()
        .forEach((t) => (t.enabled = nextState));
    }
  }

  // Release preview hardware lock before LiveKit connects
  async function handleJoinClick() {
    stopPreviewMedia();
    await onJoin({
      microphone,
      camera,
      ...(selectedAudioId ? { audioDeviceId: selectedAudioId } : {}),
      ...(selectedVideoId ? { videoDeviceId: selectedVideoId } : {}),
    });
  }

  const initials = (name || "U")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-2 md:p-6 shadow-2xl">
      <div className="grid grid-cols-1 items-center gap-4 md:gap-8 lg:grid-cols-12">
        {/* Left Column: Google Meet-style Camera Preview Card */}
        <div className="lg:col-span-7">
          <div className="relative aspect-auto md:aspect-video  w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-inner">
            {/* Mirrored Live Video Preview */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full -scale-x-100 object-cover transition-opacity duration-200 ${
                camera && !deviceError ? "opacity-100" : "opacity-0"
              }`}
            />

            {/* Camera Off / Loading Fallback */}
            {(!camera || deviceError || isInitializing) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-4 text-center">
                {isInitializing ? (
                  <>
                    <Loader2 className="mb-2 h-8 w-8 animate-spin text-emerald-400" />
                    <p className="text-sm text-slate-300">
                      Checking camera & microphone…
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-2xl font-bold text-slate-200">
                      {initials || <User className="h-8 w-8" />}
                    </div>
                    {/* <p className="text-sm font-medium text-slate-300">
                      Camera is off
                    </p> */}
                  </>
                )}
              </div>
            )}

            {/* Top-left Name Badge */}
            <div className="absolute left-2 md:left-3 top-3 rounded-lg bg-black/60 px-3 py-1 text-xs font-medium text-slate-200 backdrop-blur-sm">
              {name || "Participant"} (You){host && " · Host"}
            </div>

            {/* Bottom-left Live Mic Level Indicator */}
            <div className="absolute bottom-1 md:bottom-4 left-2 md:left-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
              {microphone ? (
                <Mic className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <MicOff className="h-3.5 w-3.5 text-rose-400" />
              )}
              <div className="flex h-2 w-16 items-center gap-0.5 overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-full bg-emerald-400 transition-all duration-75"
                  style={{ width: `${microphone ? audioLevel : 0}%` }}
                />
              </div>
            </div>

            {/* Bottom-center Circular Media Controls (Google Meet style) */}
            <div className="absolute bottom-1 md:bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-3">
              <button
                type="button"
                disabled={joining}
                onClick={handleToggleMicrophone}
                aria-label={
                  microphone ? "Turn off microphone" : "Turn on microphone"
                }
                className={cn(
                  "flex h-7 w-7 md:h-11 md:w-11 items-center justify-center rounded-full border transition-colors disabled:opacity-50 cursor-pointer",
                  {
                    "border-slate-600 bg-slate-800/90 text-white hover:bg-slate-700":
                      microphone,
                    "border-rose-500 bg-rose-600 text-white hover:bg-rose-500":
                      !microphone,
                  },
                )}
              >
                {microphone ? (
                  <Mic className="h-4 w-4 md:h-5 md:w-5" />
                ) : (
                  <MicOff className="h-4 w-4 md:h-5 md:w-5" />
                )}
              </button>

              <button
                type="button"
                disabled={joining}
                onClick={handleToggleCamera}
                aria-label={camera ? "Turn off camera" : "Turn on camera"}
                className={cn(
                  "flex h-7 w-7 md:h-11 md:w-11 items-center justify-center rounded-full border transition-colors disabled:opacity-50 cursor-pointer",
                  {
                    "border-slate-600 bg-slate-800/90 text-white hover:bg-slate-700":
                      camera,
                    "border-rose-500 bg-rose-600 text-white hover:bg-rose-500":
                      !camera,
                  },
                )}
              >
                {camera ? (
                  <Video className="h-4 w-4 md:h-5 md:w-5" />
                ) : (
                  <VideoOff className="h-4 w-4 md:h-5 md:w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Device Selectors Row */}
          <div className="mt-3 grid grid-cols-1 gap-0.5 md:gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
              <Mic className="h-4 w-4 shrink-0 text-slate-400" />
              <select
                disabled={joining || audioDevices.length === 0}
                value={selectedAudioId}
                onChange={(e) => setSelectedAudioId(e.target.value)}
                aria-label="Select microphone"
                className="w-full truncate bg-transparent text-slate-200 outline-none"
              >
                {audioDevices.length === 0 ? (
                  <option value="">Default Microphone</option>
                ) : (
                  audioDevices.map((d, idx) => (
                    <option
                      key={d.deviceId || idx}
                      value={d.deviceId}
                      className="bg-slate-900"
                    >
                      {d.label || `Microphone ${idx + 1}`}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
              <Settings className="h-4 w-4 shrink-0 text-slate-400" />
              <select
                disabled={joining || videoDevices.length === 0}
                value={selectedVideoId}
                onChange={(e) => setSelectedVideoId(e.target.value)}
                aria-label="Select camera"
                className="w-full truncate bg-transparent text-slate-200 outline-none"
              >
                {videoDevices.length === 0 ? (
                  <option value="">Default Camera</option>
                ) : (
                  videoDevices.map((d, idx) => (
                    <option
                      key={d.deviceId || idx}
                      value={d.deviceId}
                      className="bg-slate-900"
                    >
                      {d.label || `Camera ${idx + 1}`}
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>
        </div>

        {/* Right Column: Join Confirmation & Preserved Controls */}
        <div className="flex flex-col justify-center lg:col-span-5">
          <h2 className="text-2xl font-bold text-white">Ready to join?</h2>
          <p className="mt-2 text-sm text-slate-300">
            {name} (you){host && " · Host"}
          </p>
          <p className="mt-3 text-sm text-slate-400">
            Check your camera framing and microphone audio level before entering
            the room. You can also join with both devices off.
          </p>

          {deviceError && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{deviceError}</span>
            </div>
          )}

          {/* Preserved Accessible Fieldset Checkboxes (synced with video icons) */}
          <fieldset disabled={joining} className="mt-5 flex flex-col gap-2">
            <label className="inline-flex w-fit cursor-pointer items-center gap-2.5 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={microphone}
                onChange={handleToggleMicrophone}
                className="h-4 w-4 rounded border-slate-600 accent-(--color-primary-500) cursor-pointer"
              />
              Microphone on when joining
            </label>
            <label className="inline-flex w-fit cursor-pointer items-center gap-2.5 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={camera}
                onChange={handleToggleCamera}
                className="h-4 w-4 rounded border-slate-600 accent-(--color-primary-500) cursor-pointer"
              />
              Camera on when joining
            </label>
          </fieldset>

          <button
            type="button"
            disabled={joining}
            onClick={() => void handleJoinClick()}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-(--color-primary-500) px-6 py-3 text- font-semibold text-white shadow-lg shadow-blue-900/30 transition-colors hover:bg-(--color-primary-800) disabled:opacity-50 cursor-pointer"
          >
            {joining && <Loader2 className="h-4 w-4 animate-spin" />}
            {joining ? "Joining meeting…" : "Join Meeting"}
          </button>
        </div>
      </div>
    </div>
  );
}
