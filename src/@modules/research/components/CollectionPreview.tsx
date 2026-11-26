import type { RefObject } from "react";
/** One mirrored coordinate system for both collection modes. Input stays unmirrored. */
export default function CollectionPreview({ video, canvas, dimensions }: { video: RefObject<HTMLVideoElement | null>; canvas: RefObject<HTMLCanvasElement | null>; dimensions: { width: number; height: number } }) {
  return <div className="relative max-w-xl overflow-hidden rounded bg-black" style={{ aspectRatio: dimensions.width / dimensions.height }}>
    <video ref={video} muted playsInline className="h-full w-full -scale-x-100 object-contain" aria-label="Research camera preview" />
    <canvas ref={canvas} width={dimensions.width} height={dimensions.height} className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100" aria-hidden="true" />
  </div>;
}
