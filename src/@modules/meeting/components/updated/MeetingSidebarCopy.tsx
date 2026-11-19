"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import type { ChatMessageCopy } from "@/src/@modules/captions/updated/LiveKitChatTransportCopy";
import CaptionPanelCopy from "@/src/@modules/captions/updated/CaptionPanelCopy";
import type { CaptionItem } from "@/src/@modules/captions/types";
import type { SignComposerState } from "@/src/@modules/sign-recognition/useSignComposer";
import SignCaptionComposerCopy from "@/src/@modules/sign-recognition/components/updated/SignCaptionComposerCopy";
import { cn } from "@/src/@libs/utils/cn";

type Tab = "message" | "sign";

function timeLabel(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MeetingSidebarCopy({
  messages,
  captions,
  composer,
  localParticipantId,
  chatError,
  chatPending,
  onSendChat,
  open,
  onOpen,
  onClose,
  activeTab,
  onTabChange,
  connected,
}: {
  messages: readonly ChatMessageCopy[];
  captions: readonly CaptionItem[];
  composer: SignComposerState;
  localParticipantId: string;
  chatError: string;
  chatPending: boolean;
  onSendChat: (text: string) => Promise<void>;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  connected: boolean;
}) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const chronological = useMemo(
    () => [...messages].sort((a, b) => a.timestamp - b.timestamp),
    [messages],
  );
  const lastMessage = chronological.at(-1)?.id;

  useEffect(() => {
    if (followLatest.current && scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lastMessage, open, activeTab]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = text.trim();
    if (!message || chatPending) return;
    try {
      await onSendChat(message);
      setText("");
      followLatest.current = true;
    } catch {
      // The shared hook exposes the transport error and retains the typed message.
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          title="Open chat"
          aria-label="Open chat"
          onClick={onOpen}
          className="absolute bottom-5 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-[#3c4048] shadow-xl transition-colors hover:bg-[#50545d]"
        >
          <MessageCircle size={21} />
          {messages.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px]">
              {Math.min(messages.length, 99)}
            </span>
          )}
        </button>
      )}
      {open && (
        <button
          aria-label="Close chat drawer"
          onClick={onClose}
          className="fixed inset-0 z-20 bg-black/45 lg:hidden"
        />
      )}
      <aside
        aria-label="Meeting chat and sign messages"
        className={`${open ? "flex translate-x-0" : "hidden translate-x-full"} fixed bottom-24 right-0 top-0 z-30 w-full flex-col border-l border-white/10 bg-[#17191f] shadow-2xl transition-transform duration-200 sm:w-[min(100vw,25rem)] lg:static lg:bottom-auto lg:top-auto lg:z-10 lg:h-full lg:w-96 lg:shrink-0 lg:rounded-2xl lg:border lg:shadow-lg ${open ? "lg:flex" : "lg:hidden"}`}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="font-semibold">Meeting conversation</h2>
          <button
            title="Close sidebar"
            aria-label="Close sidebar"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-white/10 cursor-pointer"
          >
            <X size={19} />
          </button>
        </header>
        <div
          role="tablist"
          aria-label="Conversation type"
          className="grid shrink-0 grid-cols-2 border-b border-white/10 px-3"
        >
          <button
            role="tab"
            aria-selected={activeTab === "message"}
            onClick={() => onTabChange("message")}
            // className={`border-b-2 px-3 py-3 text-sm ${activeTab === "message" ? "border-blue-400 text-white" : "border-transparent text-slate-400"}`}
            className={cn(
              "border-b-2 px-3 py-3 text-sm cursor-pointer",
              activeTab === "message"
                ? "border-(--color-primary-400) text-white"
                : "border-transparent text-slate-400",
            )}
          >
            Message
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "sign"}
            onClick={() => onTabChange("sign")}
            // className={`border-b-2 px-3 py-3 text-sm ${activeTab === "sign" ? "border-blue-400 text-white" : "border-transparent text-slate-400"}`}
            className={cn(
              "border-b-2 px-3 py-3 text-sm cursor-pointer",
              activeTab === "sign"
                ? "border-(--color-primary-400) text-white"
                : "border-transparent text-slate-400",
            )}
          >
            Sign Message
          </button>
        </div>
        {activeTab === "message" ? (
          <>
            <div
              ref={scrollRef}
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
              onScroll={(event) => {
                const element = event.currentTarget;
                followLatest.current =
                  element.scrollHeight -
                    element.scrollTop -
                    element.clientHeight <
                  64;
              }}
            >
              {!chronological.length && (
                <p className="py-10 text-center text-sm text-slate-400">
                  Messages sent here are visible to everyone currently in this
                  meeting.
                </p>
              )}
              {chronological.map((message) => {
                const own = message.participantId === localParticipantId;
                return (
                  <article
                    key={`${message.participantId}:${message.id}`}
                    className={`max-w-[90%] rounded-2xl px-3 py-2 ${own ? "ml-auto bg-(--color-primary-800)/50" : "mr-auto bg-[#292c34]"}`}
                  >
                    <div className="mb-1 flex items-center gap-2 text-xs text-blue-100/80">
                      <strong className="max-w-40 truncate">
                        {own ? "You" : message.participantName}
                      </strong>
                      <time
                        dateTime={new Date(message.timestamp).toISOString()}
                      >
                        {timeLabel(message.timestamp)}
                      </time>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm font-semibold">
                      {message.text}
                    </p>
                  </article>
                );
              })}
              <CaptionPanelCopy
                captions={captions}
                localParticipantId={localParticipantId}
              />
            </div>
            <form
              onSubmit={(event) => void submit(event)}
              className="shrink-0 border-t border-white/10 p-3"
            >
              {chatError && (
                <p role="alert" className="mb-2 text-xs text-amber-300">
                  {chatError}
                </p>
              )}
              <div className="flex items-center gap-2 rounded-full bg-[#292c34] p-1.5 pl-4 focus-within:ring-2 focus-within:ring-(--color-primary-500)">
                <input
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  maxLength={2_000}
                  placeholder="Send a message to everyone"
                  aria-label="Message everyone in the meeting"
                  className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  title="Send message"
                  aria-label="Send message"
                  disabled={!text.trim() || chatPending || !connected}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--color-primary-500) hover:bg-(--color-primary-800) disabled:bg-slate-700 disabled:text-slate-500 cursor-pointer transition-colors"
                >
                  {chatPending ? (
                    <span className="animate-pulse">…</span>
                  ) : (
                    <Send size={17} />
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <SignCaptionComposerCopy composer={composer} connected={connected} />
        )}
      </aside>
    </>
  );
}
