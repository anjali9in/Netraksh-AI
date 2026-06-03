export type ModelFormat = 'tflite' | 'onnx' | 'coreml';

export interface ModelConfig {
  modelName: string;
  modelPath: any; // path to the local model file (.tflite or .onnx or require asset)
  modelFormat: ModelFormat;
  inputWidth: number;
  inputHeight: number;
  inputChannels: number;
  embeddingDimension: number;
  threshold: number;
  mean: number[];
  std: number[];
  quantized: boolean; // INT8 quantized for faster mobile inference
  version: string; // for DB migration tracking (model_version column)
}

/**
 * ArcFace-MobileNetV2 — upgraded from MobileFaceNet
 *
 * Accuracy  : 99.77% on LFW benchmark (vs 99.28% MobileFaceNet)
 * Embedding : 512-dim (vs 128-dim) — richer feature space
 * Threshold : 0.68 cosine similarity (lower because 512-dim space is denser)
 * Size      : ~8 MB TFLite INT8 quantized (within 20 MB budget)
 * Input     : 112×112×3 — identical to previous model, no pipeline changes
 * Source    : https://github.com/deepinsight/insightface
 */
export const FACE_RECOGNITION_MODEL: ModelConfig = {
  modelName: 'ArcFace-MobileNetV2',
  modelPath: require('../assets/models/arcface_mobilenet_v2.tflite'),
  modelFormat: 'tflite',
  inputWidth: 112,
  inputHeight: 112,
  inputChannels: 3,
  embeddingDimension: 512, // upgraded from 128 → richer face representation
  threshold: 0.68, // matches src/config/thresholds.ts FACE_MATCH_THRESHOLD
  mean: [127.5, 127.5, 127.5],
  std: [127.5, 127.5, 127.5],
  quantized: true,
  version: '2.0.0',
};
