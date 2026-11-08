import { COLLECTION as C, PARTICIPANT_ID, SESSION_ID, SAMPLE_ID } from "./config.ts";
import { array, choice, integer, iso, number, object, text } from "./validation.ts";
import type { HandObservation, Quality, SampleCheck, TemporalFrame, TemporalSample, Vocabulary } from "./types.ts";

function hand(value: unknown): HandObservation | null {
  if (value === null) return null;
  const h = object(value, ["landmarks", "reportedHandedness", "handednessConfidence", "detectionConfidence"], "Hand");
  const landmarks = array(h.landmarks, "Landmarks", 21).map(value => {
    const p = object(value, ["x", "y", "z"], "Landmark");
    return { x: number(p.x, "x", C.xyMin, C.xyMax), y: number(p.y, "y", C.xyMin, C.xyMax), z: number(p.z, "z", -C.maxAbsZ, C.maxAbsZ) };
  });
  if (landmarks.length !== 21) throw new Error("Each detected hand must contain exactly 21 landmarks.");
  return { landmarks, reportedHandedness: choice(h.reportedHandedness, ["Left", "Right", null], "Handedness"), handednessConfidence: h.handednessConfidence === null ? null : number(h.handednessConfidence, "Handedness confidence", 0, 1), detectionConfidence: choice(h.detectionConfidence, [null], "Detection confidence is unavailable") };
}
function frame(value: unknown): TemporalFrame {
  const f = object(value, ["offsetMs", "left", "right", "unassigned", "validity"], "Frame");
  const validity = object(f.validity, ["left", "right"], "Validity masks");
  const left = hand(f.left), right = hand(f.right);
  const unassigned = array(f.unassigned, "Unassigned hands", 2).map(value => {
    const result = hand(value); if (!result) throw new Error("Unassigned observation cannot be null."); return result;
  });
  if (Number(Boolean(left)) + Number(Boolean(right)) + unassigned.length > 2) throw new Error("A frame cannot contain more than two detected hands.");
  if (validity.left !== Boolean(left) || validity.right !== Boolean(right)) throw new Error("Hand-validity masks do not match the observations.");
  for (const [slot, expected] of [[left, "Right"], [right, "Left"]] as const) {
    if (slot && (slot.reportedHandedness !== expected || slot.handednessConfidence === null || slot.handednessConfidence < C.handednessThreshold)) throw new Error("Assigned slot lacks reliable handedness for unmirrored input.");
  }
  return { offsetMs: number(f.offsetMs, "Frame offset", 0, C.maxDurationMs), left, right, unassigned, validity: { left: Boolean(left), right: Boolean(right) } };
}
export function assessQuality(sample: Pick<TemporalSample, "frames" | "durationMs">, handUsage: "one" | "two" | "unknown"): Quality {
  const { frames, durationMs } = sample;
  const validFrames = frames.filter(f => f.validity.left || f.validity.right).length;
  const missingRatio = frames.length ? 1 - validFrames / frames.length : 1;
  const effectiveFps = frames.length > 1 && frames.at(-1)!.offsetMs > frames[0].offsetMs ? (frames.length - 1) * 1000 / (frames.at(-1)!.offsetMs - frames[0].offsetMs) : 0;
  const unassignedFrames = frames.filter(f => f.unassigned.length).length;
  const reject: string[] = [], warn: string[] = [];
  if (!frames.some(f => f.left || f.right || f.unassigned.length)) reject.push("No hand detected.");
  if (validFrames < C.minValidFrames) reject.push(`Too few valid frames (minimum ${C.minValidFrames}).`);
  if (missingRatio > C.rejectMissingRatio) reject.push("Excessive missing or unassigned hand frames.");
  else if (missingRatio > C.warningMissingRatio) warn.push("High missing-hand percentage.");
  if (durationMs < C.minDurationMs || durationMs > C.maxDurationMs) reject.push("Recording duration outside the configured range.");
  if (effectiveFps < C.rejectFps) reject.push("Effective capture FPS is too low.");
  else if (effectiveFps < C.warningFps) warn.push("Low effective capture FPS; review temporal detail.");
  if (unassignedFrames) warn.push("Uncertain or conflicting handedness retained as unassigned observations.");
  if (handUsage === "two" && frames.filter(f => f.left && f.right).length < frames.length * C.twoHandMinRatio) warn.push("Both hands are missing from more than half of this two-hand sample.");
  if (frames.length && (frames[0].offsetMs > C.warningGapMs || durationMs - frames.at(-1)!.offsetMs > C.warningGapMs || frames.some((f, i) => i > 0 && f.offsetMs - frames[i - 1].offsetMs > C.warningGapMs))) warn.push("Capture gaps exceed one second; no interpolated frames were inserted.");
  return { status: reject.length ? "rejected" : warn.length ? "warning" : "accepted", reasons: [...reject, ...warn], durationMs, frameCount: frames.length, validFrames, effectiveFps, missingRatio, unassignedFrames };
}
export function validateSample(value: unknown, vocabulary: Vocabulary): SampleCheck {
  try {
    const s = object(value, ["schemaVersion", "id", "vocabularyVersion", "labelId", "participantId", "sessionId", "take", "startedAt", "endedAt", "durationMs", "stoppedBy", "detector", "orientation", "consent", "appVersion", "frames", "quality"], "Sample");
    const id = text(s.id, "Sample ID", 36), participantId = text(s.participantId, "Participant ID", 7), sessionId = text(s.sessionId, "Session ID", 9);
    if (!SAMPLE_ID.test(id) || !PARTICIPANT_ID.test(participantId) || !SESSION_ID.test(sessionId)) throw new Error("Invalid sample UUID, pseudonymous participant ID (P001), or session ID (S001).");
    const labelId = text(s.labelId, "Label ID", 40);
    const label = vocabulary.labels.find(label => label.id === labelId);
    if (!label) throw new Error("Label missing from the current vocabulary.");
    if (!label.active || label.reviewStatus !== "reviewed") throw new Error("Label is inactive or not reviewed.");
    const vocabularyVersion = text(s.vocabularyVersion, "Vocabulary version", 80);
    if (vocabularyVersion !== vocabulary.version) throw new Error("Vocabulary version mismatch; supply the matching reviewed manifest.");
    const startedAt = iso(s.startedAt, "Start"), endedAt = iso(s.endedAt, "End");
    const durationMs = number(s.durationMs, "Duration", 0, C.maxDurationMs);
    if (Math.abs(Date.parse(endedAt) - Date.parse(startedAt) - durationMs) > 2) throw new Error("Start/end timestamps disagree with monotonic duration.");
    const frames = array(s.frames, "Frames", C.maxFrames).map(frame);
    if (frames.some((f, i) => f.offsetMs > durationMs || (i > 0 && f.offsetMs <= frames[i - 1].offsetMs))) throw new Error("Frame timestamps must increase strictly within sample duration.");
    const d = object(s.detector, ["name", "version", "maxNumHands", "modelComplexity", "minDetectionConfidence", "minTrackingConfidence"], "Detector");
    const o = object(s.orientation, ["inputMirrored", "previewMirrored", "handedness", "width", "height"], "Orientation");
    const c = object(s.consent, ["confirmed", "protocolVersion", "confirmedAt"], "Consent");
    const confirmedAt = iso(c.confirmedAt, "Consent timestamp");
    if (Date.parse(confirmedAt) > Date.parse(startedAt)) throw new Error("Consent must precede capture.");
    // Stored quality is advisory. Validate its shape, then recompute from raw frames.
    const q = object(s.quality, ["status", "reasons", "durationMs", "frameCount", "validFrames", "effectiveFps", "missingRatio", "unassignedFrames"], "Quality");
    choice(q.status, ["accepted", "warning", "rejected"], "Quality status");
    array(q.reasons, "Quality reasons", 20).forEach(reason => text(reason, "Quality reason", 250));
    for (const key of ["durationMs", "frameCount", "validFrames", "effectiveFps", "missingRatio", "unassignedFrames"]) number(q[key], `Quality ${key}`);
    const quality = assessQuality({ frames, durationMs }, label.handUsage);
    const sample: TemporalSample = {
      schemaVersion: choice(s.schemaVersion, [1], "Sample schema"), id, vocabularyVersion, labelId, participantId, sessionId,
      take: integer(s.take, "Take", 1, 100000), startedAt, endedAt, durationMs,
      stoppedBy: choice(s.stoppedBy, ["duration", "manual"], "Stop reason"),
      detector: { name: choice(d.name, ["@mediapipe/hands"], "Detector name"), version: choice(d.version, [C.detectorVersion], "Detector version"), maxNumHands: choice(d.maxNumHands, [2], "Max hands"), modelComplexity: choice(d.modelComplexity, [1], "Complexity"), minDetectionConfidence: number(d.minDetectionConfidence, "Detection setting", 0, 1), minTrackingConfidence: number(d.minTrackingConfidence, "Tracking setting", 0, 1) },
      orientation: { inputMirrored: choice(o.inputMirrored, [false], "Input mirror"), previewMirrored: choice(o.previewMirrored, [true], "Preview mirror"), handedness: choice(o.handedness, ["swap-unmirrored"], "Handedness policy"), width: integer(o.width, "Width", 1, 8192), height: integer(o.height, "Height", 1, 8192) },
      consent: { confirmed: choice(c.confirmed, [true], "Consent required"), protocolVersion: choice(c.protocolVersion, [C.consentVersion], "Consent protocol"), confirmedAt },
      appVersion: text(s.appVersion, "Application version", 80), frames, quality,
    };
    return { sample, quality, errors: quality.status === "rejected" ? quality.reasons : [] };
  } catch (error) { return { errors: [error instanceof Error ? error.message : "Invalid sample."] }; }
}
