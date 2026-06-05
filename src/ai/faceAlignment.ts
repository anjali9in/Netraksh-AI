import type {FaceDetectionResult} from '../types/FaceTypes';
import {loadRawPixelsFromImagePath} from './imagePixelLoader';
/** Analysis resolution — no extra TFLite model; uses shared image loader only. */
const ANALYSIS_SIZE = 160;

/** Oval matches LiveScannerPanel circle (cx 50%, cy 48%, ~50% frame width). */
const OVAL_CX_RATIO = 0.5;
const OVAL_CY_RATIO = 0.48;
const OVAL_RX_RATIO = 0.35;
const OVAL_RY_RATIO = 0.38;

const MIN_SKIN_RATIO = 0.12;
const MIN_EDGE_VARIANCE = 180;
const MIN_BRIGHTNESS = 35;
const MAX_BRIGHTNESS = 225;
const MAX_CENTER_OFFSET_RATIO = 0.14;

export type FaceAlignmentHint =
  | 'no_face'
  | 'off_center'
  | 'too_small'
  | 'too_dark'
  | 'too_bright'
  | 'aligned';

export type FaceAlignmentAnalysis = FaceDetectionResult & {
  hint: FaceAlignmentHint;
  message: string;
};

function mapHintToMessage(hint: FaceAlignmentHint): string {
  switch (hint) {
    case 'no_face':
      return 'No face detected — position your face in the circle';
    case 'off_center':
      return 'Center your face inside the circle';
    case 'too_small':
      return 'Move closer so your face fills the circle';
    case 'too_dark':
      return 'Lighting is too low — move to a brighter area';
    case 'too_bright':
      return 'Lighting is too harsh — avoid direct glare';
    case 'aligned':
      return 'Face aligned — hold still';
  }
}

/** Lightweight skin-tone check (YCbCr-style, no ML model). */
function isSkinTone(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 40 || max - min < 15) {
    return false;
  }
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return cb >= 70 && cb <= 135 && cr >= 130 && cr <= 180;
}

function inFaceOval(x: number, y: number, width: number, height: number): boolean {
  const cx = width * OVAL_CX_RATIO;
  const cy = height * OVAL_CY_RATIO;
  const rx = width * OVAL_RX_RATIO;
  const ry = height * OVAL_RY_RATIO;
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function laplacianVariance(gray: number[], width: number, height: number): number {
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const center = gray[idx];
      const lap =
        gray[idx - 1] +
        gray[idx + 1] +
        gray[idx - width] +
        gray[idx + width] -
        4 * center;
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }

  if (count === 0) {
    return 0;
  }
  const mean = sum / count;
  return sumSq / count - mean * mean;
}

function analyzePixels(
  data: Uint8Array,
  width: number,
  height: number,
): FaceAlignmentAnalysis {
  const gray = new Array<number>(width * height);
  let ovalPixels = 0;
  let skinPixels = 0;
  let brightnessSum = 0;
  let skinXSum = 0;
  let skinYSum = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      gray[y * width + x] = luma;

      if (!inFaceOval(x, y, width, height)) {
        continue;
      }

      ovalPixels++;
      brightnessSum += luma;

      if (isSkinTone(r, g, b)) {
        skinPixels++;
        skinXSum += x;
        skinYSum += y;
      }
    }
  }

  if (ovalPixels === 0) {
    return {
      detected: false,
      confidence: 0,
      hint: 'no_face',
      message: mapHintToMessage('no_face'),
    };
  }

  const avgBrightness = brightnessSum / ovalPixels;
  const skinRatio = skinPixels / ovalPixels;
  const edgeVariance = laplacianVariance(gray, width, height);

  if (avgBrightness < MIN_BRIGHTNESS) {
    return {
      detected: false,
      confidence: 0,
      hint: 'too_dark',
      message: mapHintToMessage('too_dark'),
    };
  }

  if (avgBrightness > MAX_BRIGHTNESS) {
    return {
      detected: false,
      confidence: 0,
      hint: 'too_bright',
      message: mapHintToMessage('too_bright'),
    };
  }

  if (skinRatio < MIN_SKIN_RATIO || edgeVariance < MIN_EDGE_VARIANCE) {
    return {
      detected: false,
      confidence: skinRatio,
      hint: 'no_face',
      message: mapHintToMessage('no_face'),
    };
  }

  const skinCx = skinXSum / skinPixels;
  const skinCy = skinYSum / skinPixels;
  const targetCx = width * OVAL_CX_RATIO;
  const targetCy = height * OVAL_CY_RATIO;
  const offsetX = Math.abs(skinCx - targetCx) / width;
  const offsetY = Math.abs(skinCy - targetCy) / height;

  if (offsetX > MAX_CENTER_OFFSET_RATIO || offsetY > MAX_CENTER_OFFSET_RATIO) {
    return {
      detected: true,
      confidence: skinRatio,
      hint: 'off_center',
      message: mapHintToMessage('off_center'),
    };
  }

  if (skinRatio < MIN_SKIN_RATIO + 0.06) {
    return {
      detected: true,
      confidence: skinRatio,
      hint: 'too_small',
      message: mapHintToMessage('too_small'),
    };
  }

  return {
    detected: true,
    confidence: Math.min(1, skinRatio * 2),
    hint: 'aligned',
    message: mapHintToMessage('aligned'),
  };
}

/**
 * Live alignment check before capture. Uses only {@link loadRawPixelsFromImagePath}
 * (same path as MobileFaceNet preprocessing) — no extra TFLite / ML Kit models.
 * Recognition still uses MobileFaceNet only (~5 MB, total budget 20 MB).
 */
export async function analyzeFaceAlignment(
  imagePath: string,
): Promise<FaceAlignmentAnalysis> {
  const pixels = await loadRawPixelsFromImagePath(
    imagePath,
    ANALYSIS_SIZE,
    ANALYSIS_SIZE,
  );
  const data = new Uint8Array(pixels.buffer);
  return analyzePixels(data, pixels.width, pixels.height);
}

export {mapHintToMessage, analyzePixels};
