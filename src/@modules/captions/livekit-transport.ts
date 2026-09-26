import { ConnectionState, DataPacket_Kind, RoomEvent, type Room, type RoomEventCallbacks } from "livekit-client";
import { CAPTION_CONFIG } from "./config.ts";
import { attributeCaption, encodeCaptionPacket, parseCaptionPacket } from "./protocol.ts";
import type { CaptionItem, CaptionSubmission, CaptionTransport } from "./types";

/** Small injectable port; production passes the existing Day-2 Room, tests can inject events. */
export type CaptionRoom = Pick<Room, "state" | "on" | "off" | "remoteParticipants"> & {
  localParticipant: Pick<Room["localParticipant"], "identity" | "name" | "publishData">;
};
export class LiveKitCaptionTransport implements CaptionTransport {
  private room: CaptionRoom;
  private listeners = new Set<(caption: CaptionItem) => void>();
  private seen = new Set<string>();
  private rates = new Map<string, { start: number; count: number }>();
  private sending = false;
  private disposed = false;
  private now: () => number;
  constructor(room: CaptionRoom, now = Date.now) { this.room = room; this.now = now; }
  private allow(identity: string) {
    const now = this.now();
    const previous = this.rates.get(identity);
    if (previous && now - previous.start < CAPTION_CONFIG.rateWindowMs) {
      if (previous.count >= CAPTION_CONFIG.maxMessagesPerWindow) return false;
      previous.count++; return true;
    }
    this.rates.delete(identity);
    if (this.rates.size >= CAPTION_CONFIG.maxTrackedSenders) this.rates.delete(this.rates.keys().next().value!);
    this.rates.set(identity, { start: now, count: 1 }); return true;
  }
  private deliver(caption: CaptionItem) {
    if (this.seen.has(caption.id) || this.disposed) return;
    this.seen.add(caption.id);
    if (this.seen.size > CAPTION_CONFIG.deduplicationLimit) this.seen.delete(this.seen.values().next().value!);
    for (const listener of this.listeners) listener(caption);
  }
  private receive: RoomEventCallbacks[RoomEvent.DataReceived] = (bytes, participant, kind, topic) => {
    if (topic !== CAPTION_CONFIG.topic || kind !== DataPacket_Kind.RELIABLE || !participant || this.disposed || this.room.state !== ConnectionState.Connected) return;
    // Resolve the sender from the room's authenticated participant state, never from JSON.
    const sender = this.room.remoteParticipants.get(participant.identity);
    if (!sender || sender !== participant) return;
    const envelope = parseCaptionPacket(bytes, this.now());
    if (!envelope) return;
    const caption = attributeCaption(envelope, sender);
    if (caption && !this.seen.has(caption.id) && this.allow(sender.identity)) this.deliver(caption);
  };
  subscribe(listener: (caption: CaptionItem) => void) {
    if (this.disposed) throw new Error("Caption session has ended.");
    if (!this.listeners.size) this.room.on(RoomEvent.DataReceived, this.receive);
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) this.room.off(RoomEvent.DataReceived, this.receive);
    };
  }
  async publish(input: CaptionSubmission) {
    if (this.disposed || this.room.state !== ConnectionState.Connected) throw new Error("Reconnect to the meeting before sending. Your draft is saved locally.");
    if (this.sending) throw new Error("A caption is already being sent.");
    const sender = this.room.localParticipant;
    const now = this.now();
    const payload = { ...input, participantId: sender.identity, participantName: sender.name || "Participant" };
    const bytes = encodeCaptionPacket(payload, now);
    const envelope = parseCaptionPacket(bytes, now)!;
    const caption = attributeCaption(envelope, sender);
    if (!caption) throw new Error("Your meeting identity is unavailable. Rejoin and try again.");
    if (this.seen.has(caption.id)) return;
    if (!this.allow(sender.identity)) throw new Error("Please wait a few seconds before sending another caption.");
    this.sending = true;
    try {
      await sender.publishData(bytes, { reliable: true, topic: CAPTION_CONFIG.topic });
      if (this.disposed || this.room.state !== ConnectionState.Connected) throw new Error("Connection changed while sending. Delivery is uncertain; retrying keeps the same caption ID.");
      this.deliver(caption); // Exactly one local echo, only after SDK publication succeeds.
    } catch {
      throw new Error("Caption could not be sent. Your draft is saved locally; reconnect and retry.");
    } finally { this.sending = false; }
  }
  dispose() {
    this.disposed = true;
    this.room.off(RoomEvent.DataReceived, this.receive);
    this.listeners.clear(); this.seen.clear(); this.rates.clear();
  }
}
