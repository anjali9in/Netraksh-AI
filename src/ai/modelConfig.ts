/** Maximum combined on-device TFLite model size (MobileFaceNet + MiniFASNet). */
export const TOTAL_AI_MODEL_BUDGET_MB = 20;

/** Bundled TFLite sizes (bytes): MobileFaceNet ~5.0 MB + MiniFASNet v1 ~5.7 MB. */
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
 * MobileFaceNet — lightweight offline recognition model.
 *
 * Accuracy  : practical mobile baseline for offline field authentication
 * Embedding : 128-dim normalized vector
 * Threshold : 0.75 cosine similarity baseline
 * Size      : ~5 MB TFLite asset, within the 20 MB total model budget
 * Input     : 112×112×3
 */
export const FACE_RECOGNITION_MODEL: ModelConfig = {
  modelName: 'MobileFaceNet',
  modelPath: require('../assets/models/mobilefacenet.tflite'),
  modelFormat: 'tflite',
  inputWidth: 112,
  inputHeight: 112,
  inputChannels: 3,
  embeddingDimension: 128,
  threshold: 0.75, // matches src/config/thresholds.ts
  mean: [127.5, 127.5, 127.5],
  std: [127.5, 127.5, 127.5],
  quantized: false,
  version: '1.0.0',
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
