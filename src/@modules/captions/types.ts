export interface CaptionItem {
  /** Receiver-local key namespaced by authenticated sender identity. */
  id: string; participantId: string; participantName: string;
  source: "sign" | "speech"; text: string;
  /** Unix epoch milliseconds, serialized as a JSON number. */
  timestamp: number;
}
export interface AcceptedText { text: string; timestamp: number; }
/** A retry keeps the same UUID and content. Attribution is supplied by the transport. */
export type CaptionSubmission = Pick<CaptionItem, "id" | "source" | "text" | "timestamp">;
export interface CaptionTransport {
  publish(caption: CaptionSubmission): Promise<void>;
  subscribe(listener: (caption: CaptionItem) => void): () => void;
}
export { CAPTION_CONFIG } from "./config.ts";
