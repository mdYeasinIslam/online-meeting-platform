"use client";
import { useCallback, useState } from "react";
import { appendCaption, CAPTION_HISTORY_LIMIT } from "./feed";
import type { CaptionItem } from "./types";
/** Session-local captions; only the validated transport should add remote items. */
export function useCaptionFeed(limit: number = CAPTION_HISTORY_LIMIT) {
  const [captions, setCaptions] = useState<CaptionItem[]>([]);
  const addCaption = useCallback((caption: CaptionItem) => setCaptions(items => appendCaption(items, caption, limit)), [limit]);
  const clear = useCallback(() => setCaptions([]), []);
  return { captions, addCaption, clear };
}
