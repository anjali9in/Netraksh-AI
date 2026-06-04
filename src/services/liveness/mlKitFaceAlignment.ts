import type {Face} from '@react-native-ml-kit/face-detection';

import {
  mapHintToMessage,
  type FaceAlignmentAnalysis,
  type FaceAlignmentHint,
} from '../../ai/faceAlignment';

/** Matches LiveScannerPanel oval overlay (cx 50%, cy 48%). */
const OVAL_CX_RATIO = 0.5;
const OVAL_CY_RATIO = 0.48;
const MIN_FACE_AREA_RATIO = 0.05;
const MAX_FACE_AREA_RATIO = 0.6;
const MAX_CENTER_OFFSET_X = 0.22;
const MAX_CENTER_OFFSET_Y = 0.24;
const MIN_FACE_WIDTH_RATIO = 0.18;

function buildResult(
  hint: FaceAlignmentHint,
  detected: boolean,
  confidence: number,
): FaceAlignmentAnalysis {
  return {
    detected,
    confidence,
    hint,
    message: mapHintToMessage(hint),
  };
}

/**
 * Alignment gate using Google ML Kit face bounds (same oval as the UI guide).
 */
export function evaluateMlKitFaceAlignment(
  face: Face,
  imageWidth: number,
  imageHeight: number,
): FaceAlignmentAnalysis {
  if (imageWidth <= 0 || imageHeight <= 0) {
    return buildResult('no_face', false, 0);
  }

  const {frame} = face;
  const faceCx = frame.left + frame.width / 2;
  const faceCy = frame.top + frame.height / 2;
  const targetCx = imageWidth * OVAL_CX_RATIO;
  const targetCy = imageHeight * OVAL_CY_RATIO;
  const offsetX = Math.abs(faceCx - targetCx) / imageWidth;
  const offsetY = Math.abs(faceCy - targetCy) / imageHeight;
  const areaRatio =
    (frame.width * frame.height) / (imageWidth * imageHeight);
  const widthRatio = frame.width / imageWidth;

  if (areaRatio < MIN_FACE_AREA_RATIO || widthRatio < MIN_FACE_WIDTH_RATIO) {
    return buildResult('too_small', true, areaRatio);
  }

  if (areaRatio > MAX_FACE_AREA_RATIO) {
    return buildResult('off_center', true, areaRatio);
  }

  if (offsetX > MAX_CENTER_OFFSET_X || offsetY > MAX_CENTER_OFFSET_Y) {
    return buildResult('off_center', true, 1 - offsetX);
  }

  return buildResult('aligned', true, Math.min(1, areaRatio * 4));
}
