import { array, choice, object, text } from "./validation.ts";
import type { Vocabulary, VocabularyLabel } from "./types.ts";
export function validateVocabulary(value: unknown): Vocabulary {
  const v = object(value, ["schemaVersion", "version", "notes", "labels"], "Vocabulary");
  const labels = array(v.labels, "Vocabulary labels", 50).map((value): VocabularyLabel => {
    const item = object(value, ["id", "bangla", "englishGloss", "category", "signType", "handUsage", "referenceUrl", "reviewStatus", "reviewerNotes", "active"], "Label");
    const id = text(item.id, "Label ID", 40);
    if (!/^[a-z][a-z0-9_-]*$/.test(id)) throw new Error("Label ID must use lowercase machine-readable characters.");
    const referenceUrl = item.referenceUrl === null ? null : text(item.referenceUrl, "Reference URL", 1000);
    if (referenceUrl !== null) {
      const url = new URL(referenceUrl);
      if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid reference URL.");
    }
    const label: VocabularyLabel = {
      id, bangla: text(item.bangla, "Bengali label"), englishGloss: text(item.englishGloss, "English gloss", 120, true),
      category: text(item.category, "Category", 60), signType: choice(item.signType, ["static", "dynamic", "unknown"], "Sign type"),
      handUsage: choice(item.handUsage, ["one", "two", "unknown"], "Hand usage"), referenceUrl,
      reviewStatus: choice(item.reviewStatus, ["provisional", "reviewed"], "Review status"),
      reviewerNotes: text(item.reviewerNotes, "Reviewer notes", 1000, true), active: choice(item.active, [true, false], "Active"),
    };
    if (label.active && (label.reviewStatus !== "reviewed" || label.signType === "unknown" || label.handUsage === "unknown" || !label.reviewerNotes.trim())) throw new Error("Active labels require review, known sign/hand type, and reviewer notes.");
    return label;
  });
  if (!labels.length || new Set(labels.map(label => label.id)).size !== labels.length) throw new Error("Vocabulary requires unique labels.");
  return { schemaVersion: choice(v.schemaVersion, [1], "Vocabulary schema"), version: text(v.version, "Vocabulary version", 80), notes: text(v.notes, "Notes", 1000, true), labels };
}
