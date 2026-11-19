"use client";
import { api, ApiError } from "@/src/@libs/api/client";
import { useAuth } from "@/src/@modules/auth/context/AuthProvider";
import { ROOM_ID_PATTERN } from "@/src/@modules/auth/libs/return-path";
import { useMeetingConnection } from "./useMeetingConnectionCopy";
import {
  RoomAudioRenderer,
  RoomContext,
  StartAudio,
} from "@livekit/components-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Meeting } from "../../types";
import ConnectedMeetingCopy from "./ConnectedMeetingCopy";
import CopyInviteButton from "../CopyInviteButton";
import EndMeetingControlCopy from "./EndMeetingControlCopy";
import PreJoinCopy from "./PreJoinCopy";
import JoinRequestPanelCopy from "./JoinRequestPanelCopy";
import {
  clearJoinRequestCopy,
  meetingApprovalRequestCopy,
  saveJoinRequestCopy,
  savedJoinRequestCopy,
  type JoinCredentialsCopy,
  type JoinRequestCopy,
} from "./meeting-approval-clientCopy";

export default function MeetingRoomCopy({ roomId }: { roomId: string }) {
  const router = useRouter();
  const { user, status: authStatus } = useAuth();
  const connection = useMeetingConnection(roomId);
  const leavingRef = useRef(false);
  const [endControlSlot, setEndControlSlot] = useState<HTMLDivElement | null>(
    null,
  );
  const [leaving, setLeaving] = useState(false);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [lookupTerminal, setLookupTerminal] = useState<
    "ending" | "ended" | null
  >(null);
  const [retryEnd, setRetryEnd] = useState(false);
  const [error, setError] = useState("");
  const [canRetry, setCanRetry] = useState(false);
  const [retry, setRetry] = useState(0);
  const [joinChoice, setJoinChoice] = useState<
    | "choose"
    | "guest"
    | "waiting"
    | "rejected"
    | "expired"
    | "cancelled"
    | "ready"
  >("choose");
  const [guestName, setGuestName] = useState("");
  const [joinMessage, setJoinMessage] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);
  const [activeRequest, setActiveRequest] = useState<{
    id: string;
    secret?: string;
    displayName: string;
    participantType: "guest" | "authenticated";
  } | null>(null);
  const [approvedCredentials, setApprovedCredentials] =
    useState<JoinCredentialsCopy | null>(null);
  const desiredChoices = useRef<{
    microphone: boolean;
    camera: boolean;
  } | null>(null);
  const connectingApproved = useRef(false);
  const joinConnectionRef = useRef(connection.join);
  joinConnectionRef.current = connection.join;
  const requestAccess = useCallback(
    async (displayName: string, guest: boolean, requestKey?: string) => {
      const data = await meetingApprovalRequestCopy<{
        host?: boolean;
        request?: JoinRequestCopy;
        secret?: string | null;
      }>(roomId, "", {
        method: "POST",
        body: guest ? { displayName, requestKey } : {},
      });
      if (data.host) {
        setJoinChoice("ready");
        return;
      }
      if (!data.request)
        throw new Error("The server did not create a join request.");
      const entry = {
        id: data.request.id,
        secret: data.secret ?? undefined,
        displayName,
        participantType: guest
          ? ("guest" as const)
          : ("authenticated" as const),
      };
      saveJoinRequestCopy(roomId, entry);
      setActiveRequest(entry);
      setJoinChoice("waiting");
    },
    [roomId],
  );

  useEffect(() => {
    if (authStatus !== "ready" || !meeting) return;
    const original = sessionStorage.getItem(
      `meeting-original-return:${roomId}`,
    );
    if (user && original) {
      sessionStorage.removeItem(`meeting-original-return:${roomId}`);
      if (
        original !==
        `${window.location.pathname}${window.location.search}${window.location.hash}`
      )
        router.replace(original);
    }
    const stored = savedJoinRequestCopy(roomId);
    if (stored) {
      setActiveRequest(stored);
      setJoinChoice("waiting");
      return;
    }
    if (
      user &&
      sessionStorage.getItem(`meeting-auth-intent:${roomId}`) === "1"
    ) {
      sessionStorage.removeItem(`meeting-auth-intent:${roomId}`);
      void requestAccess(user.displayName, false).catch((failure) =>
        setJoinMessage(
          failure instanceof Error
            ? failure.message
            : "Unable to request access.",
        ),
      );
    }
  }, [authStatus, meeting, roomId, user, requestAccess, router]);

  useEffect(() => {
    if (joinChoice !== "waiting" || !activeRequest) return;
    let alive = true;
    let inFlight = false;
    const inspect = async () => {
      if (!alive || inFlight) return;
      inFlight = true;
      try {
        const data = await meetingApprovalRequestCopy<{
          request: JoinRequestCopy;
          credentials?: JoinCredentialsCopy;
        }>(roomId, `/${encodeURIComponent(activeRequest.id)}`, {
          secret: activeRequest.secret,
        });
        if (!alive) return;
        if (data.request.status === "rejected") {
          clearJoinRequestCopy(roomId);
          setJoinChoice("rejected");
          return;
        }
        if (data.request.status === "expired") {
          clearJoinRequestCopy(roomId);
          setJoinChoice("expired");
          return;
        }
        if (data.request.status === "cancelled") {
          clearJoinRequestCopy(roomId);
          setJoinChoice("cancelled");
          return;
        }
        if (
          data.request.status === "accepted" &&
          data.credentials &&
          !connectingApproved.current
        ) {
          connectingApproved.current = true;
          setApprovedCredentials(data.credentials);
          setJoinChoice("ready");
          await joinConnectionRef.current(
            desiredChoices.current ?? { microphone: true, camera: true },
            data.credentials,
          );
        }
      } catch (failure) {
        if (!alive) return;
        if (failure instanceof ApiError && failure.status === 410) {
          clearJoinRequestCopy(roomId);
          setJoinChoice("expired");
          return;
        }
        setJoinMessage(
          failure instanceof Error
            ? failure.message
            : "Unable to check approval status.",
        );
      } finally {
        inFlight = false;
      }
    };
    void inspect();
    const timer = window.setInterval(() => void inspect(), 1800);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [joinChoice, activeRequest, roomId]);

  useEffect(() => {
    if (!connection.room || !activeRequest) return;
    clearJoinRequestCopy(roomId);
    sessionStorage.removeItem(`meeting-request-key:${roomId}`);
  }, [connection.room, activeRequest, roomId]);
  useEffect(() => {
    if (!ROOM_ID_PATTERN.test(roomId)) return;
    const controller = new AbortController();
    void api<{ meeting: Meeting }>(`/meetings/${roomId}`, {
      signal: controller.signal,
    })
      .then((result) => setMeeting(result.meeting))
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 410) {
          setLookupTerminal(
            error.code === "MEETING_ENDING" ? "ending" : "ended",
          );
          setRetryEnd(error.canEnd);
          return;
        }
        setError(
          error instanceof Error ? error.message : "Unable to load meeting.",
        );
        setCanRetry(
          !(error instanceof ApiError) ||
            ![400, 401, 404, 410].includes(error.status),
        );
      });
    return () => controller.abort();
  }, [roomId, retry]);

  async function leave() {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    if (await connection.leave()) router.push("/dashboard");
    else {
      leavingRef.current = false;
      setLeaving(false);
    }
  }

  async function submitGuestRequest() {
    const name = guestName.trim();
    if (!name || name.length > 50) {
      setJoinMessage("Enter a name between 1 and 50 characters.");
      return;
    }
    setJoinBusy(true);
    setJoinMessage("");
    try {
      let requestKey = sessionStorage.getItem(`meeting-request-key:${roomId}`);
      if (!requestKey) {
        const bytes = new Uint8Array(32);
        crypto.getRandomValues(bytes);
        requestKey = Array.from(bytes, (byte) =>
          byte.toString(16).padStart(2, "0"),
        ).join("");
        sessionStorage.setItem(`meeting-request-key:${roomId}`, requestKey);
      }
      await requestAccess(name, true, requestKey);
    } catch (failure) {
      setJoinMessage(
        failure instanceof Error
          ? failure.message
          : "Unable to request access.",
      );
    } finally {
      setJoinBusy(false);
    }
  }
  function startAuthenticatedChoice() {
    sessionStorage.setItem(`meeting-auth-intent:${roomId}`, "1");
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    sessionStorage.setItem(`meeting-original-return:${roomId}`, returnTo);
    router.push(`/auth?next=${encodeURIComponent(window.location.pathname)}`);
  }
  function beginJoin(choices: { microphone: boolean; camera: boolean }) {
    desiredChoices.current = choices;
    if (approvedCredentials) {
      void connection.join(choices, approvedCredentials);
      return;
    }
    if (meeting?.hostUserId === user?.id) {
      setJoinChoice("ready");
      void connection.join(choices);
      return;
    }
    if (user) {
      setJoinBusy(true);
      void requestAccess(user.displayName, false)
        .catch((failure) =>
          setJoinMessage(
            failure instanceof Error
              ? failure.message
              : "Unable to request access.",
          ),
        )
        .finally(() => setJoinBusy(false));
      return;
    }
    setJoinChoice("guest");
  }
  async function retryApprovedJoin() {
    if (!activeRequest) return;
    connectingApproved.current = false;
    try {
      const result = await meetingApprovalRequestCopy<{
        credentials?: JoinCredentialsCopy;
      }>(roomId, `/${encodeURIComponent(activeRequest.id)}`, {
        secret: activeRequest.secret,
      });
      if (result.credentials) {
        setApprovedCredentials(result.credentials);
        connectingApproved.current = true;
        await connection.join(
          desiredChoices.current ?? { microphone: true, camera: true },
          result.credentials,
        );
      }
    } catch (failure) {
      setJoinMessage(
        failure instanceof Error
          ? failure.message
          : "Could not reconnect to the meeting.",
      );
    }
  }

  if (!ROOM_ID_PATTERN.test(roomId))
    return (
      <section className="p-6">
        <h1>Invalid meeting link</h1>
        <Link href="/dashboard" className="underline">
          Return to dashboard
        </Link>
      </section>
    );
  const terminal = connection.terminal ?? lookupTerminal;
  const host =
    meeting?.hostUserId === user?.id || retryEnd || connection.canEnd;
  const endControl = host ? (
    <EndMeetingControlCopy
      roomId={roomId}
      triggerContainer={terminal ? undefined : endControlSlot}
      visible={terminal !== "ended"}
      onEnded={() => {
        connection.terminate();
        setLookupTerminal("ended");
      }}
    />
  ) : null;
  if (terminal) router.push("/");
  // return (
  //   <section className="mx-auto max-w-7xl p-4">
  //     {endControl}
  //     <h1 className="text-2xl font-bold">
  //       {terminal === "ended"
  //         ? "This meeting has ended"
  //         : "This meeting is ending"}
  //     </h1>
  //     <p className="my-4">You can no longer join using this meeting link.</p>
  //     {terminal === "ending" && (
  //       <p>
  //         Shutdown has not yet been confirmed. The host can retry ending the
  //         meeting.
  //       </p>
  //     )}
  //     <Link href="/dashboard" className="underline">
  //       Return to dashboard
  //     </Link>
  //   </section>
  // );
  if (error)
    return (
      <section className="p-6">
        <p role="alert">{error}</p>
        {canRetry && (
          <button
            className="my-3 rounded border p-2"
            onClick={() => {
              setError("");
              setMeeting(null);
              setRetry((value) => value + 1);
            }}
          >
            Retry
          </button>
        )}
        <Link className="mt-4 block underline" href="/dashboard">
          Return to dashboard
        </Link>
      </section>
    );
  if (!meeting)
    return (
      <p role="status" className="p-6">
        Loading meeting…
      </p>
    );
  return (
    <section className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-[#11131a] px-3 pb-3 pt-2 text-white sm:px-5 sm:pt-3">
      {endControl}
      <header className="mb-3 flex shrink-0 items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold sm:text-xl">
            {meeting.title}
          </h1>
          {/* <p className="mt-1 text-sm text-slate-300">
            Up to {meeting.maxParticipants} participants
          </p> */}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {/* <span className="hidden text-xs text-slate-400 sm:inline">{meeting.maxParticipants} participant limit</span> */}
          <CopyInviteButton roomId={meeting.roomId} />
        </div>
      </header>
      {connection.error && (
        <p
          role="alert"
          className="mb-3 shrink-0 rounded border border-amber-600 p-3 text-amber-200"
        >
          {connection.error}
          {approvedCredentials && !connection.room && (
            <button
              className="ml-3 underline"
              onClick={() => void retryApprovedJoin()}
            >
              Retry joining
            </button>
          )}
        </p>
      )}
      {connection.deviceErrors.length > 0 && (
        <div
          role="alert"
          className="mb-3 shrink-0 rounded border border-amber-600 p-3 text-amber-200"
        >
          {connection.deviceErrors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}
      {host && (
        <div className="absolute right-4 top-20 z-30 w-[min(28rem,calc(100vw-2rem))]">
          <JoinRequestPanelCopy roomId={roomId} />
        </div>
      )}
      {connection.room ? (
        <RoomContext.Provider value={connection.room}>
          <RoomAudioRenderer />
          <StartAudio
            label="Enable meeting audio"
            className="absolute left-3 top-16 z-20 rounded bg-blue-700 px-3 py-2 text-sm"
          />
          <ConnectedMeetingCopy
            endControlRef={setEndControlSlot}
            hostUserId={meeting.hostUserId}
            starting={connection.joining}
            leaving={leaving}
            onLeave={() => void leave()}
          />
        </RoomContext.Provider>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* <PreJoin
            name={user?.displayName ?? activeRequest?.displayName ?? guestName}
            host={meeting.hostUserId === user?.id}
            joining={connection.joining}
            onJoin={connection.join}
          /> */}
          {joinChoice === "choose" && authStatus === "ready" && !user ? (
            <div className="mx-auto mt-12 max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-7 text-center shadow-2xl">
              <h2 className="text-2xl font-semibold">Join meeting</h2>
              <p className="mt-3 text-slate-300">
                Would you like to authenticate before joining this meeting?
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={startAuthenticatedChoice}
                  className="rounded-xl bg-blue-600 px-4 py-3 font-medium"
                >
                  Yes, authenticate
                </button>
                <button
                  onClick={() => setJoinChoice("guest")}
                  className="rounded-xl border border-white/20 px-4 py-3 font-medium"
                >
                  No, continue as guest
                </button>
              </div>
            </div>
          ) : null}
          {joinChoice === "guest" && !activeRequest && (
            <div className="mx-auto mt-12 max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-4 md:p-7 shadow-2xl">
              <h2 className="text-2xl font-semibold">Join as guest</h2>
              <p className="mt-2 text-slate-300">
                Enter your name to request access to this meeting.
              </p>
              <label className="mt-5 block text-sm" htmlFor="guest-name">
                Display name
              </label>
              <input
                id="guest-name"
                maxLength={50}
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3"
                placeholder="Enter your name"
              />
              {joinMessage && (
                <p role="alert" className="mt-3 text-sm text-amber-200">
                  {joinMessage}
                </p>
              )}
              <button
                disabled={joinBusy}
                onClick={() => void submitGuestRequest()}
                className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 font-medium disabled:opacity-50 cursor-pointer"
              >
                {joinBusy ? "Requesting…" : "Request to join"}
              </button>
            </div>
          )}
          {joinChoice === "waiting" && (
            <div className="mx-auto mt-12 max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-8 text-center shadow-2xl">
              <div className="mx-auto grid size-12 place-items-center rounded-full bg-blue-500/15 text-blue-200">
                <span className="animate-pulse">●</span>
              </div>
              <h2 className="mt-4 text-2xl font-semibold">
                Waiting for the host
              </h2>
              <p className="mt-2 text-slate-300">
                Waiting for the host to let you in…
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Joining as {activeRequest?.displayName}
              </p>
              {joinMessage && (
                <p role="alert" className="mt-3 text-sm text-amber-200">
                  {joinMessage}
                </p>
              )}
              <button
                disabled={!activeRequest}
                onClick={() => {
                  if (!activeRequest) return;
                  void meetingApprovalRequestCopy(
                    roomId,
                    `/${encodeURIComponent(activeRequest.id)}/cancel`,
                    { method: "POST", secret: activeRequest.secret },
                  )
                    .then(() => {
                      clearJoinRequestCopy(roomId);
                      setActiveRequest(null);
                      setJoinChoice("cancelled");
                    })
                    .catch((failure) =>
                      setJoinMessage(
                        failure instanceof Error
                          ? failure.message
                          : "Could not cancel this request.",
                      ),
                    );
                }}
                className="mt-6 rounded-xl border border-white/20 px-4 py-2"
              >
                Cancel request
              </button>
            </div>
          )}
          {(["rejected", "expired", "cancelled"] as const).includes(
            joinChoice as "rejected" | "expired" | "cancelled",
          ) && (
            <div className="mx-auto mt-12 max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-8 text-center">
              <h2 className="text-xl font-semibold">
                {joinChoice === "rejected"
                  ? "The host declined your request to join this meeting."
                  : joinChoice === "expired"
                    ? "This meeting request has expired."
                    : "Your join request was cancelled."}
              </h2>
              <button
                className="mt-5 rounded-xl border border-white/20 px-4 py-2 cursor-pointer"
                onClick={() => {
                  setActiveRequest(null);
                  setJoinChoice(user ? "ready" : "choose");
                }}
              >
                Try again
              </button>
            </div>
          )}
          {(joinChoice === "ready" || (user && joinChoice === "choose")) && (
            <PreJoinCopy
              name={user?.displayName ?? ""}
              host={meeting.hostUserId === user?.id}
              joining={connection.joining || joinBusy}
              onJoin={async (choices) => beginJoin(choices)}
            />
          )}
          {joinMessage &&
            joinChoice !== "guest" &&
            joinChoice !== "waiting" && (
              <p
                role="alert"
                className="mx-auto mt-3 max-w-lg text-center text-sm text-amber-200"
              >
                {joinMessage}
              </p>
            )}
          <div className="mt-4 flex md:flex-wrap justify-between items-center gap-3">
            <button
              disabled={leaving}
              onClick={() => void leave()}
              className="rounded border p-2 md:p-3 cursor-pointer"
            >
              Leave meeting
            </button>
            <div ref={setEndControlSlot} className="contents" />
          </div>
        </div>
      )}
    </section>
  );
}
