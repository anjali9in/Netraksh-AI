/** Maximum combined on-device TFLite model size (ArcFace + MiniFASNet). */
export const TOTAL_AI_MODEL_BUDGET_MB = 20;

/** Bundled TFLite sizes (bytes): ArcFace ~5.0 MB + MiniFASNet v1 ~5.7 MB. */
export const BUNDLED_TFLITE_SIZE_BYTES = 5_233_552 + 5_979_004;

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

/**
 * MiniFASNet v1 (80×80) — silent anti-spoofing after liveness challenges.
 * Converted from Silent-Face-Anti-Spoofing (2.7× face crop, BGR float input).
 */
export const ANTI_SPOOF_MODEL: ModelConfig = {
  modelName: 'MiniFASNet-V1-80x80',
  modelPath: require('../assets/models/minifasnet_v1_80x80.tflite'),
  modelFormat: 'tflite',
  inputWidth: 80,
  inputHeight: 80,
  inputChannels: 3,
  embeddingDimension: 3,
  threshold: 0.5,
  mean: [0, 0, 0],
  std: [1, 1, 1],
  quantized: false,
  version: '1.0.0',
};
