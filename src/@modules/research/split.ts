import { counts, motionFingerprint } from "./dataset.ts";
import type { TemporalSample, Vocabulary } from "./types.ts";
export const SPLITS = ["train", "validation", "test"] as const;
export interface SplitManifest {
  schemaVersion: 1; seed: string; ratios: number[]; vocabularyVersion: string;
  algorithm: "participant-fisher-yates-v1";
  splits: Record<typeof SPLITS[number], { participants: string[]; sampleIds: string[]; labels: Record<string, number> }>;
  warnings: string[]; leakage: false;
}
export function checkLeakage(manifest: SplitManifest, samples: TemporalSample[]): string[] {
  const errors: string[] = [], owners = new Map<string, string>(), seen = new Set<string>();
  const byId = new Map(samples.map(s => [s.id, s]));
  for (const name of SPLITS) {
    for (const participant of manifest.splits[name].participants) {
      if (owners.has(participant)) errors.push("Participant leakage or duplicate participant assignment.");
      owners.set(participant, name);
    }
    for (const id of manifest.splits[name].sampleIds) {
      const sample = byId.get(id);
      if (!sample || !manifest.splits[name].participants.includes(sample.participantId) || seen.has(id)) errors.push("Invalid or duplicate sample assignment.");
      seen.add(id);
    }
  }
  if (samples.some(s => !seen.has(s.id))) errors.push("Samples missing from split manifest.");
  return errors;
}
export function splitDataset(samples: TemporalSample[], vocabulary: Vocabulary, seed: string, ratios = [0.7, 0.15, 0.15]): SplitManifest {
  if (!seed.trim() || seed.length > 100) throw new Error("Provide an explicit seed of 1–100 characters.");
  if (ratios.length !== 3 || ratios.some(n => !Number.isFinite(n) || n <= 0) || Math.abs(ratios.reduce((a, b) => a + b, 0) - 1) > 0.000001) throw new Error("Three positive split ratios must sum to one.");
  if (new Set(samples.map(s => s.id)).size !== samples.length) throw new Error("Duplicate sample IDs prevent splitting.");
  if (samples.some(s => s.quality.status === "rejected")) throw new Error("Rejected samples prevent splitting.");
  if (new Set(samples.map(motionFingerprint)).size !== samples.length) throw new Error("Identical sequences must be reviewed and deduplicated before splitting.");
  const participants = [...new Set(samples.map(s => s.participantId))].sort();
  if (participants.length < 3) throw new Error("At least three participants are required for a nonempty signer-independent three-way split. Collect more signers; consider leave-one-signer-out later.");
  let state = 2166136261;
  for (const character of seed) state = Math.imul(state ^ character.charCodeAt(0), 16777619);
  const random = () => { state += 0x6D2B79F5; let n = Math.imul(state ^ state >>> 15, 1 | state); n ^= n + Math.imul(n ^ n >>> 7, 61 | n); return ((n ^ n >>> 14) >>> 0) / 4294967296; };
  for (let i = participants.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [participants[i], participants[j]] = [participants[j], participants[i]]; }
  // One signer per split, then greedily fill greatest target deficit. Never split a signer.
  const sizes = [1, 1, 1];
  for (let remaining = participants.length - 3; remaining > 0; remaining--) {
    const deficits = ratios.map((ratio, i) => ratio * participants.length - sizes[i]);
    sizes[deficits.indexOf(Math.max(...deficits))]++;
  }
  const warnings = ["Ratios target participant counts, not sample counts; no class balancing is guaranteed."];
  if (participants.length < 10) warnings.push("Few participants: three-way estimates will be unstable. Consider grouped k-fold or leave-one-signer-out in later evaluation.");
  const groups = { train: { participants: [] as string[], sampleIds: [] as string[], labels: {} }, validation: { participants: [] as string[], sampleIds: [] as string[], labels: {} }, test: { participants: [] as string[], sampleIds: [] as string[], labels: {} } };
  let offset = 0;
  for (const [i, name] of SPLITS.entries()) {
    const group = participants.slice(offset, offset + sizes[i]).sort(); offset += sizes[i];
    const selected = samples.filter(s => group.includes(s.participantId));
    groups[name] = { participants: group, sampleIds: selected.map(s => s.id).sort(), labels: counts(selected.map(s => s.labelId)) };
    for (const label of vocabulary.labels.filter(l => l.active)) if (!selected.some(s => s.labelId === label.id)) warnings.push(`${name}: label ${label.id} is absent.`);
  }
  const result: SplitManifest = { schemaVersion: 1, seed, ratios, vocabularyVersion: vocabulary.version, algorithm: "participant-fisher-yates-v1", splits: groups, warnings, leakage: false };
  if (checkLeakage(result, samples).length) throw new Error("Internal split integrity check failed.");
  return result;
}
