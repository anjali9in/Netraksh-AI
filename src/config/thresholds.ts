// Updated for ArcFace-MobileNetV2: 512-dim embeddings use 0.68 baseline
// (MobileFaceNet 128-dim used 0.75 — lower threshold is correct for denser 512-dim space)
export const FACE_MATCH_THRESHOLD = 0.68;
export const BLINK_THRESHOLD = 0.22;
export const MAX_AUTH_TIME_MS = 1000;

// Liveness detection thresholds
export const SMILE_THRESHOLD = 0.50;
export const HEAD_TURN_RIGHT_THRESHOLD = 0.60;
export const HEAD_TURN_LEFT_THRESHOLD = 1.60;
