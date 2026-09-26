import { CAPTION_CONFIG, validCaptionText } from "./config.ts";
import type { CaptionItem } from "./types";
export const CAPTION_HISTORY_LIMIT = CAPTION_CONFIG.historyLimit;
export function appendCaption(history: readonly CaptionItem[], item: CaptionItem, limit: number = CAPTION_HISTORY_LIMIT): CaptionItem[] {
  if (!Number.isInteger(limit) || limit < 1 || limit > CAPTION_HISTORY_LIMIT) throw new Error("Caption history limit must be between 1 and 200.");
  if (!item.id || !item.participantId || !item.participantName || !["sign", "speech"].includes(item.source) || !validCaptionText(item.text) || !Number.isSafeInteger(item.timestamp) || item.timestamp < 0) return [...history];
  if (history.some(existing => existing.id === item.id)) return [...history];
  return [...history, item].slice(-limit);
}
