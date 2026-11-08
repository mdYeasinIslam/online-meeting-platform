export function classificationMetrics(truth: number[], probabilities: number[][], labels: { id: string; bangla: string }[]) {
  const count = labels.length;
  if (!count || !truth.length || truth.length !== probabilities.length) throw new Error("Nonempty aligned labels/probabilities required");
  const confusion = Array.from({ length: count }, () => Array(count).fill(0) as number[]);
  let loss = 0;
  probabilities.forEach((row, index) => {
    if (!Number.isInteger(truth[index]) || truth[index] < 0 || truth[index] >= count || row.length !== count || row.some(value => !Number.isFinite(value) || value < 0 || value > 1) || Math.abs(row.reduce((a, b) => a + b, 0) - 1) > 1e-3) throw new Error("Invalid classification output");
    confusion[truth[index]][row.indexOf(Math.max(...row))]++;
    loss -= Math.log(Math.max(1e-7, row[truth[index]]));
  });
  const perClass = labels.map((label, index) => {
    const support = confusion[index].reduce((a, b) => a + b, 0), predicted = confusion.reduce((sum, row) => sum + row[index], 0), truePositive = confusion[index][index];
    const precision = predicted ? truePositive / predicted : 0, recall = support ? truePositive / support : 0;
    return { index, ...label, support, predicted, precision, recall, f1: precision + recall ? 2 * precision * recall / (precision + recall) : 0 };
  });
  const aggregate = (weighted: boolean) => Object.fromEntries((["precision", "recall", "f1"] as const).map(metric => [metric, perClass.reduce((sum, row) => sum + row[metric] * (weighted ? row.support / truth.length : 1 / count), 0)]));
  return { samples: truth.length, loss: loss / truth.length, accuracy: perClass.reduce((sum, row) => sum + confusion[row.index][row.index], 0) / truth.length, macro: aggregate(false), weighted: aggregate(true), perClass, confusion, unsupportedClasses: perClass.filter(row => !row.support).map(row => row.id), zeroDivision: "0; macro includes all configured classes, including zero support" };
}
