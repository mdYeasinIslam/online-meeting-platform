import type { CaptionSubmission, CaptionTransport } from "../captions/types";
import { appendDraftToken, removeLastToken } from "./draft.ts";
export interface DraftState { tokens: readonly string[]; sending: boolean; error: string; sent: boolean; }
/** Model/UI-independent confirmation controller, also usable with future accepted words. */
export class RecognizedDraft {
  private state: DraftState = { tokens: [], sending: false, error: "", sent: false };
  private listeners = new Set<() => void>();
  private retry?: CaptionSubmission;
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(change: Partial<DraftState>) {
    this.state = { ...this.state, ...change };
    for (const listener of this.listeners) listener();
  }
  accept = (text: string) => {
    try { this.update({ tokens: appendDraftToken(this.state.tokens, text), sent: false }); }
    catch (error) { this.update({ error: error instanceof Error ? error.message : "Could not add the accepted token." }); }
  };
  edit = (clear: boolean) => {
    if (this.state.sending) return;
    this.retry = undefined;
    this.update({ tokens: clear ? [] : removeLastToken(this.state.tokens), error: "", sent: false });
  };
  async send(publish: CaptionTransport["publish"]) {
    const text = this.state.tokens.join("");
    if (!text || this.state.sending) return;
    const count = this.state.tokens.length;
    const submission: CaptionSubmission = { id: this.retry?.text === text ? this.retry.id : crypto.randomUUID(), source: "sign", text, timestamp: Date.now() };
    this.retry = submission;
    this.update({ sending: true, error: "", sent: false });
    try {
      await publish(submission);
      // Do not remove tokens accepted while publication was in flight.
      this.update({ tokens: this.state.tokens.slice(count), sent: true });
      this.retry = undefined;
    } catch (error) {
      this.update({ error: error instanceof Error ? error.message : "Caption could not be sent. Your draft is preserved." });
    } finally { this.update({ sending: false }); }
  }
}
