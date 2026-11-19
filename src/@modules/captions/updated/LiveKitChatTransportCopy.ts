import {
  ConnectionState,
  DataPacket_Kind,
  RoomEvent,
  type Room,
  type RoomEventCallbacks,
} from "livekit-client";

const CHAT_TOPIC = "bdsl.chat.v1";
const MAX_PACKET_BYTES = 8_192;
const MAX_TEXT_CODE_POINTS = 2_000;
const MAX_MESSAGES_PER_WINDOW = 20;
const RATE_WINDOW_MS = 10_000;
const HISTORY_LIMIT = 300;
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export interface ChatMessageCopy {
  id: string;
  participantId: string;
  participantName: string;
  text: string;
  timestamp: number;
}

type Packet = { version: 1; type: "chat"; id: string; text: string; timestamp: number };
type ChatRoom = Pick<Room, "state" | "on" | "off" | "remoteParticipants"> & {
  localParticipant: Pick<Room["localParticipant"], "identity" | "name" | "publishData">;
};

function parsePacket(bytes: Uint8Array, now = Date.now()): Packet | null {
  if (!bytes.byteLength || bytes.byteLength > MAX_PACKET_BYTES) return null;
  let value: unknown;
  try {
    value = JSON.parse(decoder.decode(bytes));
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const packet = value as Record<string, unknown>;
  if (
    Object.keys(packet).length !== 5 ||
    packet.version !== 1 ||
    packet.type !== "chat" ||
    typeof packet.id !== "string" ||
    !ID_PATTERN.test(packet.id) ||
    typeof packet.text !== "string" ||
    !packet.text.trim() ||
    !packet.text.isWellFormed() ||
    Array.from(packet.text).length > MAX_TEXT_CODE_POINTS ||
    typeof packet.timestamp !== "number" ||
    !Number.isSafeInteger(packet.timestamp) ||
    packet.timestamp < now - 5 * 60_000 ||
    packet.timestamp > now + 60_000
  ) {
    return null;
  }
  return { version: 1, type: "chat", id: packet.id.toLowerCase(), text: packet.text.trim().normalize("NFC"), timestamp: packet.timestamp };
}

/** Room-scoped, authenticated-sender chat over LiveKit reliable data packets. */
export class LiveKitChatTransportCopy {
  private readonly room: ChatRoom;
  private readonly listeners = new Set<(message: ChatMessageCopy) => void>();
  private readonly seen = new Set<string>();
  private readonly rates = new Map<string, { start: number; count: number }>();
  private sending = false;
  private disposed = false;

  constructor(room: ChatRoom) {
    this.room = room;
  }

  private allow(identity: string) {
    const now = Date.now();
    const previous = this.rates.get(identity);
    if (previous && now - previous.start < RATE_WINDOW_MS) {
      if (previous.count >= MAX_MESSAGES_PER_WINDOW) return false;
      previous.count++;
      return true;
    }
    this.rates.delete(identity);
    if (this.rates.size >= 64) this.rates.delete(this.rates.keys().next().value!);
    this.rates.set(identity, { start: now, count: 1 });
    return true;
  }

  private deliver(message: ChatMessageCopy) {
    const key = `${message.participantId}:${message.id}`;
    if (this.disposed || this.seen.has(key)) return;
    this.seen.add(key);
    if (this.seen.size > HISTORY_LIMIT * 2) this.seen.delete(this.seen.values().next().value!);
    for (const listener of this.listeners) listener(message);
  }

  private receive: RoomEventCallbacks[RoomEvent.DataReceived] = (bytes, participant, kind, topic) => {
    if (
      this.disposed ||
      this.room.state !== ConnectionState.Connected ||
      topic !== CHAT_TOPIC ||
      kind !== DataPacket_Kind.RELIABLE ||
      !participant
    ) return;
    const sender = this.room.remoteParticipants.get(participant.identity);
    if (!sender || sender !== participant) return;
    const packet = parsePacket(bytes);
    if (!packet || !this.allow(sender.identity)) return;
    this.deliver({
      ...packet,
      participantId: sender.identity,
      participantName: sender.name?.trim().slice(0, 120) || "Participant",
    });
  };

  subscribe(listener: (message: ChatMessageCopy) => void) {
    if (this.disposed) throw new Error("Chat session has ended.");
    if (!this.listeners.size) this.room.on(RoomEvent.DataReceived, this.receive);
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) this.room.off(RoomEvent.DataReceived, this.receive);
    };
  }

  async publish(text: string) {
    if (this.disposed || this.room.state !== ConnectionState.Connected) {
      throw new Error("Reconnect to the meeting before sending a message.");
    }
    const normalized = text.trim().normalize("NFC");
    if (!normalized || !normalized.isWellFormed() || Array.from(normalized).length > MAX_TEXT_CODE_POINTS) {
      throw new Error("Enter a message of 1–2,000 characters.");
    }
    if (this.sending) throw new Error("A message is already being sent.");
    const sender = this.room.localParticipant;
    if (!sender.identity || !this.allow(sender.identity)) {
      throw new Error("Please wait a few seconds before sending another message.");
    }
    const packet: Packet = { version: 1, type: "chat", id: crypto.randomUUID(), text: normalized, timestamp: Date.now() };
    const bytes = encoder.encode(JSON.stringify(packet));
    if (bytes.byteLength > MAX_PACKET_BYTES) throw new Error("Message is too large to send.");
    this.sending = true;
    try {
      await sender.publishData(bytes, { reliable: true, topic: CHAT_TOPIC });
      if (this.disposed || this.room.state !== ConnectionState.Connected) {
        throw new Error("Connection changed while sending. Delivery is uncertain.");
      }
      this.deliver({
        ...packet,
        participantId: sender.identity,
        participantName: sender.name?.trim().slice(0, 120) || "Participant",
      });
    } catch (error) {
      throw error instanceof Error && error.message.startsWith("Connection changed")
        ? error
        : new Error("Message could not be sent. Reconnect and try again.");
    } finally {
      this.sending = false;
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.room.off(RoomEvent.DataReceived, this.receive);
    this.listeners.clear();
    this.seen.clear();
    this.rates.clear();
  }
}
