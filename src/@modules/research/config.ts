/** Engineering starting thresholds, not experimentally established research criteria. */
export const COLLECTION = {
  appVersion: "day4-1", consentVersion: "day4-consent-v1",
  detectorVersion: "0.4.1675469240",
  assetRoot: "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/",
  countdownMs: 3000, durationMs: 4000, targetFps: 15, uiIntervalMs: 250, recorderTickMs: 100,
  hands: { selfieMode: false, maxNumHands: 2, modelComplexity: 1 as const, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 },
  handednessThreshold: 0.8,
  minDurationMs: 2000, maxDurationMs: 8000, minValidFrames: 8,
  warningMissingRatio: 0.4, rejectMissingRatio: 0.9,
  warningFps: 5, rejectFps: 1, warningGapMs: 1000, twoHandMinRatio: 0.5,
  xyMin: -0.25, xyMax: 1.25, maxAbsZ: 2,
  maxFrames: 360, maxLocalSamples: 100, maxFileBytes: 20 * 1024 * 1024,
  maxDatasetBytes: 100 * 1024 * 1024, maxDatasetSamples: 3000,
};
// Deliberately disallow arbitrary names/emails. A pseudonym still needs human care.
export const PARTICIPANT_ID = /^P[0-9]{3,6}$/;
export const SESSION_ID = /^S[0-9]{3,8}$/;
export const SAMPLE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
