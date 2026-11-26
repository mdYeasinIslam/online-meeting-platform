import manifest from "../../../../dataset/manifests/phrase-v3-vocabulary.json" with { type: "json" };
export const PHRASE_VOCABULARY = manifest;
const expected = ["hello", "good_morning", "good_night", "how_are_you", "i_am_fine", "good_afternoon", "unknown"];
if (manifest.reviewStatus !== "provisional" || manifest.labels.length !== 7 || manifest.labels.some((label, index) => label.index !== index || label.id !== expected[index])) throw new Error("Invalid fixed phrase pilot vocabulary.");
export const PHRASE_LABELS = Object.fromEntries(manifest.labels.map(label => [label.index, label.bangla])) as Record<string, string>;
export const PHRASE_LABEL_IDS = Object.fromEntries(manifest.labels.map(label => [label.index, label.id])) as Record<string, string>;
