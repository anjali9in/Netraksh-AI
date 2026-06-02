// Updated for ArcFace-MobileNetV2: 512-dim embeddings use 0.68 baseline
// (MobileFaceNet 128-dim used 0.75 — lower threshold is correct for denser 512-dim space)
export const FACE_MATCH_THRESHOLD = 0.68;
export const BLINK_THRESHOLD = 0.22;
export const MAX_AUTH_TIME_MS = 1000;
