// Updated for MobileFaceNet: 128-dim embeddings use 0.75 baseline
export const FACE_MATCH_THRESHOLD = 0.75;
/** Classic 6-point EAR (unit tests / fallback). */
export const BLINK_THRESHOLD = 0.25;
/** ML Kit contour height/width — eye closed when below this. */
export const BLINK_EAR_ASPECT_CLOSED = 0.2;
export const BLINK_EAR_ASPECT_OPEN = 0.24;
/** ML Kit classificationMode eye-open probability (0–1). */
export const BLINK_EYE_OPEN_CLOSED = 0.6;
export const BLINK_EYE_OPEN_OPEN = 0.65;
export const SMILE_PROBABILITY_DETECTED = 0.75;
export const SMILE_MAR_DETECTED = 0.35;
export const MAX_AUTH_TIME_MS = 1000;

// Liveness detection thresholds
export const SMILE_THRESHOLD = 0.50;
export const HEAD_TURN_RIGHT_THRESHOLD = 0.6;
export const HEAD_TURN_LEFT_THRESHOLD = 1.4;
/** Easier cheek-ratio band for enrollment / front camera. */
export const HEAD_TURN_RIGHT_THRESHOLD_RELAXED = 0.75;
export const HEAD_TURN_LEFT_THRESHOLD_RELAXED = 1.25;
/** ML Kit face.rotationY (degrees) when cheek ratio is compressed. */
export const HEAD_TURN_ROTATION_DEGREES = 15;
export const HEAD_TURN_ROTATION_DEGREES_RELAXED = 10;
