import type { RecognitionFrame, Landmark } from "./types";
/** Geometric continuity, not an identity tracker. No mirroring or left/right coordinate conversion. */
export class StaticHandSelector {
  private previous?: { wrist: Landmark; side: string };
  reset() { this.previous = undefined; }
  select(hands: RecognitionFrame["hands"]) {
    const candidates = hands.map((hand, index) => ({ hand, index })).filter(({ hand }) => hand.landmarks.length === 21 && hand.landmarks.every(point => [point.x, point.y, point.z].every(Number.isFinite)));
    if (!candidates.length) { this.reset(); return { index: null, changed: false }; }
    const previous = this.previous;
    const distance = (wrist: Landmark) => previous ? Math.hypot(wrist.x - previous.wrist.x, wrist.y - previous.wrist.y) : 0;
    if (previous) candidates.sort((a, b) => distance(a.hand.landmarks[0]) - distance(b.hand.landmarks[0]) || a.index - b.index);
    const selected = candidates[0], wrist = selected.hand.landmarks[0];
    const changed = !!previous && (distance(wrist) > 0.25 || (previous.side !== "unknown" && selected.hand.side !== "unknown" && previous.side !== selected.hand.side));
    this.previous = { wrist: { ...wrist }, side: selected.hand.side };
    return { index: selected.index, changed };
  }
}
