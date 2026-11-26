/** Same green points for raw/accepted hands, independent of feature assignment.
 * Mirror the canvas with CSS alongside the video, never mirror detector input.
 */
export function drawHandLandmarks(canvas: HTMLCanvasElement | null, hands: readonly (readonly { x: number; y: number }[])[]) {
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = "#34d399";
  for (const hand of hands) for (const point of hand) {
    if (![point.x, point.y].every(Number.isFinite)) continue;
    ctx.beginPath(); ctx.arc(point.x * ctx.canvas.width, point.y * ctx.canvas.height, 3, 0, Math.PI * 2); ctx.fill();
  }
}
