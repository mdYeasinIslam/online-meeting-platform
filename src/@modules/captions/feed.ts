import type { CaptionItem } from "./types";
export const CAPTION_HISTORY_LIMIT = 200;
export function appendCaption(history: readonly CaptionItem[], item: CaptionItem, limit = CAPTION_HISTORY_LIMIT): CaptionItem[] {
  if (!Number.isInteger(limit) || limit < 1) throw new Error("Caption history limit must be positive.");
  if (!item.id || !item.participantId || !item.participantName || !["sign", "speech"].includes(item.source) || !item.text.trim() || item.text.length > 2000 || !Number.isFinite(item.timestamp) || item.timestamp < 0) return [...history];
  if (history.some(existing => existing.id === item.id)) return [...history];
  return [...history, item].slice(-limit);
}
