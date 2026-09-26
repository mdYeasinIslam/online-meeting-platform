import { CAPTION_CONFIG, CAPTION_ID_PATTERN, validCaptionText } from "./config.ts";
import type { CaptionItem } from "./types";
export interface CaptionEnvelope { version: 1; type: "caption"; payload: CaptionItem; }
export interface CaptionSender { identity: string; name?: string; }
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exactKeys(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
export function parseCaptionPacket(bytes: Uint8Array, now = Date.now()): CaptionEnvelope | null {
  if (!bytes.byteLength || bytes.byteLength > CAPTION_CONFIG.maxPacketBytes) return null;
  let decoded: unknown;
  try { decoded = JSON.parse(decoder.decode(bytes)); } catch { return null; }
  if (!record(decoded) || !exactKeys(decoded, ["version", "type", "payload"]) || decoded.version !== CAPTION_CONFIG.version || decoded.type !== "caption" || !record(decoded.payload)) return null;
  const p = decoded.payload;
  if (!exactKeys(p, ["id", "participantId", "participantName", "source", "text", "timestamp"]) ||
    typeof p.id !== "string" || !CAPTION_ID_PATTERN.test(p.id) ||
    typeof p.participantId !== "string" || !p.participantId.trim() || p.participantId.length > CAPTION_CONFIG.maxIdentityLength ||
    typeof p.participantName !== "string" || !p.participantName.trim() || p.participantName.length > CAPTION_CONFIG.maxNameLength ||
    (p.source !== "sign" && p.source !== "speech") || !validCaptionText(p.text) ||
    typeof p.timestamp !== "number" || !Number.isSafeInteger(p.timestamp) || p.timestamp < 0 ||
    p.timestamp > now + CAPTION_CONFIG.maxFutureSkewMs || p.timestamp < now - CAPTION_CONFIG.maxMessageAgeMs) return null;
  return { version: 1, type: "caption", payload: { id: p.id, participantId: p.participantId, participantName: p.participantName, source: p.source, text: p.text.normalize("NFC").trim(), timestamp: p.timestamp } };
}
export function encodeCaptionPacket(payload: CaptionItem, now = Date.now()): Uint8Array<ArrayBuffer> {
  const bytes = encoder.encode(JSON.stringify({ version: CAPTION_CONFIG.version, type: "caption", payload }));
  if (!parseCaptionPacket(bytes, now)) throw new Error("Caption is empty, too long, expired, or invalid.");
  return bytes;
}
/** Payload attribution never wins; IDs are namespaced to prevent cross-sender dedup poisoning. */
export function attributeCaption(envelope: CaptionEnvelope, sender: CaptionSender): CaptionItem | null {
  if (!sender.identity || sender.identity.length > CAPTION_CONFIG.maxIdentityLength) return null;
  return { ...envelope.payload, id: `${sender.identity}:${envelope.payload.id.toLowerCase()}`, participantId: sender.identity, participantName: sender.name?.trim().slice(0, CAPTION_CONFIG.maxNameLength) || "Participant" };
}
