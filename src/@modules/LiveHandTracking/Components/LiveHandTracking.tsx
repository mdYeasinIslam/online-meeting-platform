"use client";

import { useEffect, useRef, useState } from "react";

const LiveHandTracking = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [detectedSign, setDetectedSign] = useState<string>(
    "হাত দেখান (Show Hand)",
  );
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  useEffect(() => {
    let camera: any = null;

    async function setupMediaPipe() {
      // Dynamically import MediaPipe modules on the client side
      const handsModule = await import("@mediapipe/hands");
      const cameraUtilsModule = await import("@mediapipe/camera_utils");

      const hands = new handsModule.Hands({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });

      hands.onResults((results) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw video frame on canvas
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

        // Draw hand keypoints if detected
        if (
          results.multiHandLandmarks &&
          results.multiHandLandmarks.length > 0
        ) {
          const landmarks = results.multiHandLandmarks[0];

          // Draw connections & points
          drawConnectors(ctx, landmarks, handsModule.HAND_CONNECTIONS, {
            color: "#00FF00",
            lineWidth: 3,
          });
          drawLandmarks(ctx, landmarks, { color: "#FF0000", lineWidth: 2 });

          // Placeholder prediction logic for Day 1
          // Day 2 we will replace this with our trained AI model!
          setDetectedSign("হাত সনাক্ত করা হয়েছে (Hand Detected)");
        } else {
          setDetectedSign("কোনো হাত পাওয়া যায়নি (No Hand Detected)");
        }
      });

      if (videoRef.current) {
        camera = new cameraUtilsModule.Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current) {
              await hands.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480,
        });
        camera.start();
        setIsCameraActive(true);
      }
    }

    setupMediaPipe();

    return () => {
      if (camera) camera.stop();
    };
  }, []);

  // Simple canvas drawing helper functions
  function drawLandmarks(
    ctx: CanvasRenderingContext2D,
    landmarks: any[],
    style: any,
  ) {
    for (const lm of landmarks) {
      const x = lm.x * ctx.canvas.width;
      const y = lm.y * ctx.canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = style.color;
      ctx.fill();
    }
  }

  function drawConnectors(
    ctx: CanvasRenderingContext2D,
    landmarks: any[],
    connections: any[],
    style: any,
  ) {
    for (const [start, end] of connections) {
      const p1 = landmarks[start];
      const p2 = landmarks[end];
      if (p1 && p2) {
        ctx.beginPath();
        ctx.moveTo(p1.x * ctx.canvas.width, p1.y * ctx.canvas.height);
        ctx.lineTo(p2.x * ctx.canvas.width, p2.y * ctx.canvas.height);
        ctx.strokeStyle = style.color;
        ctx.lineWidth = style.lineWidth;
        ctx.stroke();
      }
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-2">
        Bangla Sign Language Recognition
      </h1>
      <p className="text-gray-400 mb-6">Thesis Prototype Demo (Phase 1)</p>

      {/* Video / Canvas Container */}
      <div className="relative w-[640px] h-[480px] bg-black rounded-xl overflow-hidden shadow-2xl border-2 border-emerald-500">
        <video
          ref={videoRef}
          className="hidden"
          playsInline
          muted
          width={640}
          height={480}
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="w-full h-full transform -scale-x-100" // Mirror camera feed
        />
      </div>

      {/* Real-time Recognition Box */}
      <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700 w-[640px] text-center">
        <span className="text-gray-400 text-sm block mb-1">
          প্রমোহ/চিহ্নিত শব্দ (Recognized Output):
        </span>
        <span className="text-3xl font-extrabold text-emerald-400">
          {detectedSign}
        </span>
      </div>
    </main>
  );
};
export default LiveHandTracking;
