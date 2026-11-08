// SYNTHETIC TEST DATA ONLY: invented coordinates, no human or real BdSL recording.
import { COLLECTION as C } from "../../src/@modules/research/config.ts";
import { assessQuality } from "../../src/@modules/research/sample.ts";
export function vocabulary() {
  return {
    schemaVersion: 1, version: "synthetic-tests-only", notes: "Synthetic test vocabulary; not expert reviewed.",
    labels: [["greeting", "অভিবাদন"], ["thanks", "ধন্যবাদ"]].map(([id, bangla]) => ({
      id, bangla, englishGloss: id, category: "synthetic", signType: "dynamic", handUsage: "one",
      referenceUrl: null, reviewStatus: "reviewed", active: true,
      reviewerNotes: "Synthetic automated test assertion only; not an expert-reviewed sign.",
    })),
  };
}
export function observation(label = "Right", variation = 0) {
  return { landmarks: Array.from({ length: 21 }, (_, i) => ({ x: 0.2 + i * 0.01 + variation, y: 0.3 + i * 0.005, z: i === 0 ? 0 : -i * 0.001 })), reportedHandedness: label, handednessConfidence: 0.95, detectionConfidence: null };
}
export function sample(index = 1, participantId = "P001", sessionId = "S001") {
  const frames = Array.from({ length: 40 }, (_, i) => ({ offsetMs: i * 100, left: observation("Right", index * 0.0001 + i * 0.0002), right: null, unassigned: [], validity: { left: true, right: false } }));
  return {
    schemaVersion: 1, id: `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`, vocabularyVersion: "synthetic-tests-only", labelId: "greeting", participantId, sessionId, take: 1,
    startedAt: "2026-01-01T00:00:01.000Z", endedAt: "2026-01-01T00:00:05.000Z", durationMs: 4000, stoppedBy: "duration",
    detector: { name: "@mediapipe/hands", version: C.detectorVersion, maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 },
    orientation: { inputMirrored: false, previewMirrored: true, handedness: "swap-unmirrored", width: 640, height: 480 },
    consent: { confirmed: true, protocolVersion: C.consentVersion, confirmedAt: "2026-01-01T00:00:00.000Z" },
    appVersion: "synthetic-fixture-not-real-data", frames, quality: assessQuality({ frames, durationMs: 4000 }, "one"),
  };
}
