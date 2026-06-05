import {loadRawPixelsFromImagePath} from './imagePixelLoader';

const ANALYSIS_WIDTH = 160;
const ANALYSIS_HEIGHT = 160;

const MIN_AVG_BRIGHTNESS = 45;
const MAX_AVG_BRIGHTNESS = 215;
const DARK_PIXEL_THRESHOLD = 35;
const BRIGHT_PIXEL_THRESHOLD = 245;
const MAX_CLIPPED_RATIO = 0.35;
const MIN_SHARPNESS_SCORE = 0.45;
const MIN_EXPOSURE_SCORE = 0.55;
const MIN_OVERALL_QUALITY = 0.6;

export type EnrollmentQualityResult = {
  passed: boolean;
  brightness: number;
  sharpness: number;
  exposure: number;
  overallQuality: number;
  blurVariance: number;
  underexposedRatio: number;
  overexposedRatio: number;
  reason: string;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round(value: number, decimals: number = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function laplacianVariance(gray: number[], width: number, height: number): number {
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x;
      const laplacian =
        gray[index - 1] +
        gray[index + 1] +
        gray[index - width] +
        gray[index + width] -
        4 * gray[index];
      sum += laplacian;
      sumSq += laplacian * laplacian;
      count++;
    }
  }

  if (count === 0) {
    return 0;
  }

  const mean = sum / count;
  return Math.max(0, sumSq / count - mean * mean);
}

function buildReason(result: Omit<EnrollmentQualityResult, 'reason'>): string {
  if (
    result.brightness < MIN_AVG_BRIGHTNESS ||
    result.underexposedRatio > MAX_CLIPPED_RATIO
  ) {
    return 'Lighting is too low. Move to a brighter area and retake the photo.';
  }

  if (
    result.brightness > MAX_AVG_BRIGHTNESS ||
    result.overexposedRatio > MAX_CLIPPED_RATIO
  ) {
    return 'Lighting is too harsh. Avoid glare or direct light and retake the photo.';
  }

  if (result.exposure < MIN_EXPOSURE_SCORE) {
    return 'Exposure is uneven. Retake the photo with your face evenly lit.';
  }

  if (result.sharpness < MIN_SHARPNESS_SCORE) {
    return 'Capture is blurry. Hold still and retake the photo.';
  }

  if (result.overallQuality < MIN_OVERALL_QUALITY) {
    return 'Capture quality is below the enrollment threshold. Retake the photo.';
  }

  return 'Brightness, exposure, and sharpness are suitable for enrollment.';
}

export function analyzeEnrollmentQualityPixels(
  data: Uint8Array,
  width: number,
  height: number,
): EnrollmentQualityResult {
  const pixelCount = width * height;

  if (pixelCount <= 0 || data.length < pixelCount * 4) {
    throw new Error('Invalid pixel buffer for enrollment quality analysis.');
  }

  const gray = new Array<number>(pixelCount);
  let brightnessSum = 0;
  let darkPixels = 0;
  let brightPixels = 0;

  for (let pixel = 0; pixel < pixelCount; pixel++) {
    const offset = pixel * 4;
    const value = luma(data[offset], data[offset + 1], data[offset + 2]);
    gray[pixel] = value;
    brightnessSum += value;

    if (value < DARK_PIXEL_THRESHOLD) {
      darkPixels++;
    } else if (value > BRIGHT_PIXEL_THRESHOLD) {
      brightPixels++;
    }
  }

  const brightness = brightnessSum / pixelCount;
  const underexposedRatio = darkPixels / pixelCount;
  const overexposedRatio = brightPixels / pixelCount;
  const blurVariance = laplacianVariance(gray, width, height);
  const sharpness = clamp01(Math.log10(blurVariance + 1) / 4);
  const brightnessScore = clamp01(1 - Math.abs(brightness - 128) / 128);
  const exposure = clamp01(1 - (underexposedRatio + overexposedRatio) * 1.8);
  const overallQuality = clamp01(
    sharpness * 0.45 + exposure * 0.35 + brightnessScore * 0.2,
  );

  const resultWithoutReason = {
    passed:
      brightness >= MIN_AVG_BRIGHTNESS &&
      brightness <= MAX_AVG_BRIGHTNESS &&
      underexposedRatio <= MAX_CLIPPED_RATIO &&
      overexposedRatio <= MAX_CLIPPED_RATIO &&
      sharpness >= MIN_SHARPNESS_SCORE &&
      exposure >= MIN_EXPOSURE_SCORE &&
      overallQuality >= MIN_OVERALL_QUALITY,
    brightness: Math.round(brightness),
    sharpness: round(sharpness),
    exposure: round(exposure),
    overallQuality: round(overallQuality),
    blurVariance: round(blurVariance, 1),
    underexposedRatio: round(underexposedRatio),
    overexposedRatio: round(overexposedRatio),
  };

  return {
    ...resultWithoutReason,
    reason: buildReason(resultWithoutReason),
  };
}

export async function analyzeEnrollmentImageQuality(
  imagePath: string,
): Promise<EnrollmentQualityResult> {
  const pixels = await loadRawPixelsFromImagePath(
    imagePath,
    ANALYSIS_WIDTH,
    ANALYSIS_HEIGHT,
  );

  return analyzeEnrollmentQualityPixels(
    new Uint8Array(pixels.buffer),
    pixels.width,
    pixels.height,
  );
}
