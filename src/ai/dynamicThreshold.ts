import { FACE_MATCH_THRESHOLD } from '../config/thresholds';

export type EnvironmentCondition = 'OPTIMAL' | 'LOW_LIGHT' | 'HARSH_LIGHT' | 'SHADOW' | 'UNKNOWN';

export type ThresholdResult = {
  threshold: number;
  condition: EnvironmentCondition;
  reason: string;
};

/**
 * Detects the lighting environment from an image brightness score.
 * @param brightnessScore A value between 0 (pure black) and 255 (pure white), representing average pixel brightness.
 */
export function detectEnvironmentCondition(brightnessScore: number): EnvironmentCondition {
  if (brightnessScore < 40) {
    return 'LOW_LIGHT'; // Dark tunnel, night-time, or unlit area
  } else if (brightnessScore > 210) {
    return 'HARSH_LIGHT'; // Direct harsh sunlight or bright flash
  } else if (brightnessScore >= 40 && brightnessScore < 80) {
    return 'SHADOW'; // Partial shadow or shade
  } else if (brightnessScore >= 80 && brightnessScore <= 210) {
    return 'OPTIMAL'; // Well-lit indoor or outdoor conditions
  }
  return 'UNKNOWN';
}

/**
 * Dynamically adjusts the face match threshold based on the detected environment condition.
 *
 * Core Principle:
 * In poor lighting, the AI model produces less reliable embeddings.
 * To prevent false positives (wrong person being accepted), we raise the threshold.
 * In optimal conditions, we use the baseline threshold.
 *
 * @param brightnessScore Average brightness of the captured face frame (0-255).
 * @param imageQualityScore Optional sharpness/blur score (0.0 to 1.0). 1.0 = perfectly sharp.
 */
export function getDynamicThreshold(
  brightnessScore: number,
  imageQualityScore: number = 1.0
): ThresholdResult {
  const condition = detectEnvironmentCondition(brightnessScore);
  let threshold = FACE_MATCH_THRESHOLD; // Baseline: 0.68 (ArcFace-MobileNetV2)
  let reason = '';

  switch (condition) {
    case 'OPTIMAL':
      threshold = FACE_MATCH_THRESHOLD; // 0.68
      reason = 'Optimal lighting detected. Using standard ArcFace baseline threshold.';
      break;

    case 'SHADOW':
      threshold = FACE_MATCH_THRESHOLD + 0.03; // 0.71
      reason = 'Shadow/partial shade detected. Threshold raised slightly for safety.';
      break;

    case 'LOW_LIGHT':
      threshold = FACE_MATCH_THRESHOLD + 0.07; // 0.75
      reason = 'Low light detected. Threshold raised significantly to prevent false positives.';
      break;

    case 'HARSH_LIGHT':
      threshold = FACE_MATCH_THRESHOLD + 0.05; // 0.73
      reason = 'Harsh/glare lighting detected. Threshold raised to compensate for over-exposed face regions.';
      break;

    case 'UNKNOWN':
    default:
      threshold = FACE_MATCH_THRESHOLD + 0.05; // 0.73 (conservative fallback)
      reason = 'Unknown lighting condition. Using conservative threshold as a safety fallback.';
      break;
  }

  // Additional adjustment: if the image is blurry, raise threshold further
  if (imageQualityScore < 0.5) {
    threshold = Math.min(threshold + 0.05, 0.95); // Cap at 0.95 to avoid being impossibly strict
    reason += ` Image quality is low (score: ${imageQualityScore.toFixed(2)}). Threshold raised further.`;
  }

  console.log(`[DynamicThreshold] Condition: ${condition} | Brightness: ${brightnessScore} | Quality: ${imageQualityScore.toFixed(2)} | Threshold: ${threshold.toFixed(2)}`);

  return {
    threshold,
    condition,
    reason,
  };
}
