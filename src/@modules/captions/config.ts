/** All Day-3 wire, retention and anti-flood limits. Text length counts Unicode code points. */
export const CAPTION_CONFIG = {
  version: 1,
  topic: "bdsl.captions.v1",
  maxTextCodePoints: 500,
  maxPacketBytes: 8192,
  maxIdentityLength: 128,
  maxNameLength: 120,
  historyLimit: 200,
  deduplicationLimit: 400,
  maxMessageAgeMs: 5 * 60 * 1000,
  maxFutureSkewMs: 60 * 1000,
  rateWindowMs: 10_000,
  maxMessagesPerWindow: 5,
  maxTrackedSenders: 64,
  scrollThresholdPx: 48,
} as const;
export const CAPTION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const captionTextLength = (text: string) => Array.from(text).length;
export function validCaptionText(text: unknown): text is string {
  return typeof text === "string" && text.isWellFormed() && !!text.trim() && captionTextLength(text) <= CAPTION_CONFIG.maxTextCodePoints && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(text);
}
