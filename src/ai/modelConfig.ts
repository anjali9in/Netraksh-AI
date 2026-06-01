export interface ModelConfig {
  modelName: string;
  modelPath: string; // path to the local model file (.tflite or .onnx)
  inputWidth: number;
  inputHeight: number;
  inputChannels: number;
  embeddingDimension: number;
  threshold: number;
  mean: number[];
  std: number[];
}

export const FACE_RECOGNITION_MODEL: ModelConfig = {
  modelName: "MobileFaceNet",
  modelPath: "models/mobilefacenet.tflite", // lightweight model, ~5.2 MB (target under 20 MB)
  inputWidth: 112,
  inputHeight: 112,
  inputChannels: 3,
  embeddingDimension: 128,
  threshold: 0.75, // matches src/config/thresholds.ts
  mean: [127.5, 127.5, 127.5],
  std: [127.5, 127.5, 127.5],
};
