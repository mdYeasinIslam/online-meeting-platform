import * as tf from "@tensorflow/tfjs";
export class ModelAssetMissingError extends Error {
  constructor() { super("A recognition model asset is missing. Check model.json, its weight shard and labels.json."); this.name = "ModelAssetMissingError"; }
}
/** The preserved Keras export prefixes all 14 weights with sequential/. TF.js layer names do not. */
export async function loadStaticLayersModel(handler: tf.io.IOHandler = tf.io.http("/model/model.json")) {
  if (!handler.load) throw new Error("The model loader cannot read model assets.");
  let artifacts: tf.io.ModelArtifacts;
  try { artifacts = await handler.load(); }
  catch (error) {
    if (error instanceof Error && /404|not found/i.test(error.message)) throw new ModelAssetMissingError();
    throw error;
  }
  if (!artifacts.modelTopology || !artifacts.weightSpecs?.length || !artifacts.weightData) throw new Error("Model topology or trained weights are missing.");
  const specs = artifacts.weightSpecs.map(weight => ({ ...weight, name: weight.name.replace(/^sequential\//, "") }));
  if (new Set(specs.map(weight => weight.name)).size !== specs.length) throw new Error("Duplicate model weight names.");
  const byteLength = Array.isArray(artifacts.weightData) ? artifacts.weightData.reduce((sum, data) => sum + data.byteLength, 0) : artifacts.weightData.byteLength;
  if (specs.some(weight => weight.dtype !== "float32") || byteLength !== specs.reduce((sum, weight) => sum + weight.shape.reduce((a, b) => a * b, 1) * 4, 0)) throw new Error("Unexpected weight dtype or byte length.");
  // Own the model before strict weight assignment, so failures can dispose it too.
  const model = await tf.loadLayersModel(tf.io.fromMemory({ modelTopology: artifacts.modelTopology }));
  let decoded: tf.NamedTensorMap | undefined;
  try {
    decoded = tf.tidy(() => tf.io.decodeWeights(artifacts.weightData!, specs));
    if (Object.keys(decoded).length !== model.weights.length) throw new Error("Unexpected weight tensor count.");
    for (const weight of model.weights) {
      const tensor = decoded[weight.originalName];
      if (!tensor || JSON.stringify(tensor.shape) !== JSON.stringify(weight.shape) || !Array.from(tensor.dataSync()).every(Number.isFinite)) throw new Error("Missing, incompatible or non-finite model weight.");
    }
    model.loadWeights(decoded, true);
    return model;
  } catch (error) { model.dispose(); throw error; }
  finally { if (decoded) tf.dispose(decoded); }
}
