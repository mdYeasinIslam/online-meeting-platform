import type { AcceptedText } from "@/src/@modules/captions/types";
export interface Landmark { x: number; y: number; z: number; }
export interface RecognitionFrame {
  /** Unix epoch milliseconds. */
  timestamp: number;
  hands: { side: "left" | "right" | "unknown"; landmarks: Landmark[] }[];
  pose?: Landmark[];
}
export type Prediction =
  | { state: "prediction"; text: string; confidence: number; timestamp: number }
  | { state: "no-hand" | "unknown"; timestamp: number };
/** A temporal engine may retain a frame buffer and perform sign boundary detection internally. */
export interface SignRecognitionEngine {
  readonly kind: "static-alphabet" | "temporal";
  load(): Promise<void>;
  predict(frame: RecognitionFrame): Promise<Prediction>;
  dispose(): void;
}
export type AcceptedTextListener = (result: AcceptedText) => void;
