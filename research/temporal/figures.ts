import { writeFile } from "node:fs/promises";
import path from "node:path";
import type { classificationMetrics } from "./metrics.ts";
const xml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const wrap = (content: string, height = 520) => `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="${height}" viewBox="0 0 900 ${height}" role="img"><rect width="100%" height="100%" fill="white"/><g font-family="Noto Sans Bengali, Noto Sans, sans-serif" fill="#182030">${content}</g></svg>`;
export async function curves(directory: string, history: { loss: number; valLoss: number; accuracy: number; valAccuracy: number }[], synthetic = false) {
  for (const metric of ["loss", "accuracy"] as const) {
    const lines = [history.map(row => row[metric]), history.map(row => metric === "loss" ? row.valLoss : row.valAccuracy)];
    const max = Math.max(1, ...lines.flat());
    await writeFile(path.join(directory, `${metric}.svg`), wrap(`<text x="40" y="30">${synthetic ? "SYNTHETIC TEST ONLY: " : ""}Training / validation ${metric} — blue / orange; x: epoch, y: ${metric} (0–${max.toFixed(3)})</text><path d="M60 60V450H850" fill="none" stroke="black"/>${lines.map((values, i) => `<polyline fill="none" stroke="${i ? "#c75a00" : "#005faf"}" stroke-width="2" points="${values.map((value, index) => `${60 + index * 780 / Math.max(1, values.length - 1)},${450 - value / max * 380}`).join(" ")}"/>`).join("")}<text x="60" y="480">1</text><text x="810" y="480">${history.length}</text>`));
  }
}
export async function evaluationFigures(directory: string, metrics: ReturnType<typeof classificationMetrics>, synthetic = false) {
  const n = metrics.perClass.length, cell = Math.min(45, 600 / n), size = 150 + cell * n;
  let contents = `<text x="20" y="25">${synthetic ? "SYNTHETIC TEST ONLY: " : ""}Held-out test confusion matrix: rows true, columns predicted</text>`;
  metrics.perClass.forEach((label, row) => {
    const name = `${row}: ${label.bangla}`;
    contents += `<text x="5" y="${120 + row * cell + cell / 2}">${xml(name)}</text><text transform="translate(${155 + row * cell},110) rotate(-45)">${xml(name)}</text>`;
    metrics.confusion[row].forEach((value, col) => { contents += `<rect x="${150 + col * cell}" y="${120 + row * cell}" width="${cell}" height="${cell}" fill="#d8e8f8" stroke="white"/><text x="${154 + col * cell}" y="${120 + row * cell + cell / 2}">${value}</text>`; });
  });
  await writeFile(path.join(directory, "confusion.svg"), wrap(contents, size + 60));
  await writeFile(path.join(directory, "per-class-f1.svg"), wrap(`<text x="20" y="25">${synthetic ? "SYNTHETIC TEST ONLY: " : ""}Held-out test per-class F1 (0–1)</text>` + metrics.perClass.map((row, index) => `<text x="5" y="${65 + index * 32}">${index}: ${xml(row.bangla)}</text><rect x="150" y="${45 + index * 32}" width="${row.f1 * 600}" height="22" fill="#005faf"/><text x="770" y="${65 + index * 32}">${row.f1.toFixed(3)}</text>`).join(""), 90 + 32 * n));
  await writeFile(path.join(directory, "per-class.csv"), 'index,label_id,bangla,precision,recall,f1,support\n' + metrics.perClass.map(row => [row.index, row.id, `"${row.bangla.replaceAll('"', '""')}"`, row.precision, row.recall, row.f1, row.support].join(",")).join("\n"));
}
