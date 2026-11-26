import * as tf from "@tensorflow/tfjs";
import { readFileSync } from "node:fs";
const dir = new URL("../public/phrase-model/", import.meta.url);
const read = (n) => readFileSync(new URL(n, dir));
const j = JSON.parse(read("model.json"));
const w = read("weights.bin");
const model = await tf.loadLayersModel(
  tf.io.fromMemory({
    modelTopology: j.modelTopology,
    weightSpecs: j.weightsManifest[0].weights,
    weightData: w.buffer.slice(w.byteOffset, w.byteOffset + w.byteLength),
  }),
);
const r = JSON.parse(readFileSync(new URL("../phrase-pilot/reference.json", import.meta.url)));
const labels = JSON.parse(read("labels.json"));
const input = tf.tensor3d(r.X);
const output = model.predict(input);
const rows = await output.array();
let max = 0;
rows.forEach((row, i) => {
  row.forEach(
    (v, k) => (max = Math.max(max, Math.abs(v - r.predictions[i][k]))),
  );
  console.info(labels[i], "=>", labels[row.indexOf(Math.max(...row))]);
});
console.info("Maximum probability difference:", max);
input.dispose();
output.dispose();
model.dispose();
if (max > 0.0001) throw new Error("Prediction parity failed");
console.info("PASS: TensorFlow.js prediction parity");
