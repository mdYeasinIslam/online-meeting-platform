"use client";

import { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import {
  drawConnectors,
  drawLandmarks,
  normalizeLandmarks,
} from "../libs/helper";
const LiveHandTracking = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [detectedSign, setDetectedSign] = useState<string>(
    "ক্যামেরা অন করুন / হাত দেখান (Show Hand)",
  );
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [confidence, setConfidence] = useState<number>(0);
  const [isModelLoaded, setIsModelLoaded] = useState<boolean>(false);

  // Refs for tracking active objects across renders
  const modelRef = useRef<tf.LayersModel | null>(null);
  const labelsRef = useRef<{ [key: string]: string }>({});

  // Load TensorFlow.js Model & Labels
  useEffect(() => {
    async function loadModelAndLabels() {
      try {
        console.log("Loading TensorFlow.js model...");
        // Ensure TF backend is ready
        await tf.ready();
        console.log("Model loaded successfully:");

        // Load Keras model from public/model/model.json
        // NEW CODE:
        const loadedModel = await tf.loadLayersModel("/model/model.json", {
          strict: false,
        });
        modelRef.current = loadedModel;

        // Load class label mappings from public/model/labels.json
        const labelsResponse = await fetch("/model/labels.json");
        const labelsData = await labelsResponse.json();
        labelsRef.current = labelsData;

        setIsModelLoaded(true);
        console.log("✅ Model and Labels successfully loaded!");
      } catch (error) {
        console.error("❌ Failed to load model or labels:", error);
      }
    }

    loadModelAndLabels();
  }, []);
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
        maxNumHands: 2,
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
          // Run AI Inference if model is loaded
          if (modelRef.current && Object.keys(labelsRef.current).length > 0) {
            tf.tidy(() => {
              // Extract and normalize 63 features
              const normalizedFeatures = normalizeLandmarks(landmarks);

              // Convert array to 2D Tensor shape [1, 63]
              const inputTensor = tf.tensor2d([normalizedFeatures], [1, 63]);

              // Execute model prediction
              const prediction = modelRef.current!.predict(
                inputTensor,
              ) as tf.Tensor;
              const probabilities = prediction.dataSync();

              // Get top predicted class index & confidence score
              const maxProbability = Math.max(...Array.from(probabilities));
              const predictedClassIndex = probabilities.indexOf(maxProbability);

              const predictedLabel =
                labelsRef.current[predictedClassIndex.toString()] ||
                "অজানা (Unknown)";

                console.log(maxProbability);
              setDetectedSign(predictedLabel);
              setConfidence(Math.round(maxProbability * 1000));
            });
          }
          // Placeholder prediction logic for Day 1
          // Day 2 we will replace this with our trained AI model!
          // setDetectedSign("হাত সনাক্ত করা হয়েছে (Hand Detected)");
        } else {
          // setDetectedSign("কোনো হাত পাওয়া যায়নি (No Hand Detected)");
          setDetectedSign("হাত দেখান (Show Hand)");
          setConfidence(0);
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
console.log(isModelLoaded);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-2">
        Bangla Sign Language Recognition
      </h1>
      <p className="text-gray-400 mb-6">Thesis Prototype Demo (Phase 1)</p>
      {/* Model Status Indicator */}
      <div className="mb-4">
        {isModelLoaded ? (
          <span className="bg-emerald-900 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-500">
            🟢 AI Model Ready (In-Browser TF.js)
          </span>
        ) : (
          <span className="bg-yellow-900 text-yellow-300 text-xs font-semibold px-3 py-1 rounded-full border border-yellow-500">
            🟡 Loading AI Model...
          </span>
        )}
      </div>
      {/* Video / Canvas Container */}
      <div className="relative w-160 h-120 bg-black rounded-xl overflow-hidden shadow-2xl border-2 border-emerald-500">
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

      {/* Real-time Result Card */}
      <div className="mt-6 p-5 bg-gray-800 rounded-xl border border-gray-700 w-160 text-center shadow-lg">
        <span className="text-gray-400 text-sm block mb-1">
          চিহ্নিত বাংলা বর্ণ (Recognized Bangla Sign):
        </span>
        <div className="flex items-center justify-center space-x-3 my-2">
          <span className="text-5xl font-extrabold text-emerald-400 ">
            {detectedSign}
          </span>
        </div>
        {confidence > 0 && (
          <span className="text-xs text-gray-400">
            নির্ভুলতার হার (Confidence):{" "}
            <strong className="text-emerald-300">{confidence}%</strong>
          </span>
        )}
      </div>
    </main>
  );
};
export default LiveHandTracking;
