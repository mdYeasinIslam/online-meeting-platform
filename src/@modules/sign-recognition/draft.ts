import { CAPTION_CONFIG, captionTextLength, validCaptionText } from "../captions/config.ts";
/** Tokens are kept whole: Backspace never splits a Bengali combining sequence. */
export function appendDraftToken(tokens: readonly string[], accepted: string): string[] {
  const token = accepted.normalize("NFC");
  if (!validCaptionText(token)) throw new Error("The accepted token is invalid.");
  if (captionTextLength(tokens.join("") + token) > CAPTION_CONFIG.maxTextCodePoints) throw new Error("Draft is full. Send it or remove a token before adding more.");
  return [...tokens, token];
}
export function removeLastToken(tokens: readonly string[]) { return tokens.slice(0, -1); }
