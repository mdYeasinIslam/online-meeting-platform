export interface CaptionItem {
  id: string; participantId: string; participantName: string;
  source: "sign" | "speech"; text: string;
  /** Unix epoch milliseconds, serialized as a JSON number. */
  timestamp: number;
}
export interface AcceptedText { text: string; timestamp: number; }
export interface CaptionTransport {
  publish(caption: CaptionItem): Promise<void>;
  subscribe(listener: (caption: CaptionItem) => void): () => void;
}
export const CAPTION_TOPIC = "bdsl.captions.v1";
