import type {Face, Point} from '@react-native-ml-kit/face-detection';

import {
  livenessService,
  type Landmark,
} from './livenessService';

function toLandmark(point: Point): Landmark {
  return {x: point.x, y: point.y};
}

/** Height/width of eye contour — drops sharply when the eye closes. */
export function contourEyeAspectRatio(points: Point[]): number | null {
  if (points.length < 4) {
    return null;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  const width = maxX - minX;
  const height = maxY - minY;
  if (width < 1) {
    return null;
  }

  return height / width;
}

function contourToEarLandmarks(points: Point[]): Landmark[] {
  if (points.length < 4) {
    return [];
  }

  const byX = [...points].sort((a, b) => a.x - b.x);
  const p1 = byX[0];
  const p4 = byX[byX.length - 1];
  const inner = byX.slice(1, -1);
  const byY = [...inner].sort((a, b) => a.y - b.y);
  const half = Math.max(1, Math.floor(byY.length / 2));
  const top = byY.slice(0, half);
  const bottom = byY.slice(half);

  const p2 = top[0] ?? p1;
  const p3 = top[top.length - 1] ?? p4;
  const p5 = bottom[bottom.length - 1] ?? p4;
  const p6 = bottom[0] ?? p1;

  return [p1, p2, p3, p4, p5, p6].map(toLandmark);
}

function averagePoint(points: Point[]): Point | null {
  if (points.length === 0) {
    return null;
  }
  const sum = points.reduce(
    (acc, point) => ({x: acc.x + point.x, y: acc.y + point.y}),
    {x: 0, y: 0},
  );
  return {x: sum.x / points.length, y: sum.y / points.length};
}

function mouthTopFromFace(face: Face): Point | null {
  const upperLip = face.contours?.upperLipTop?.points;
  if (upperLip && upperLip.length > 0) {
    return averagePoint(upperLip);
  }

  const landmarks = face.landmarks;
  if (
    landmarks?.mouthLeft?.position &&
    landmarks?.mouthRight?.position &&
    landmarks?.mouthBottom?.position
  ) {
    const left = landmarks.mouthLeft.position;
    const right = landmarks.mouthRight.position;
    const bottom = landmarks.mouthBottom.position;
    const centerX = (left.x + right.x) / 2;
    const centerY = (left.y + right.y) / 2;
    const topY = centerY - (bottom.y - centerY) * 0.55;
    return {x: centerX, y: topY};
  }

  return null;
}

/**
 * Maps Google ML Kit landmarks/contours to EAR, MAR, and yaw ratio
 * using the same formulas as {@link livenessService}.
 */
function averageEyeOpenProbability(face: Face): number | undefined {
  const left = face.leftEyeOpenProbability;
  const right = face.rightEyeOpenProbability;
  if (left === undefined && right === undefined) {
    return undefined;
  }
  const values = [left, right].filter(
    (value): value is number => value !== undefined,
  );
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function combineEyeAspect(
  contourPoints: Point[],
  classicLandmarks: Landmark[],
): number {
  const aspect = contourEyeAspectRatio(contourPoints);
  const classic =
    classicLandmarks.length >= 6
      ? livenessService.calculateEAR(classicLandmarks)
      : null;

  if (aspect !== null && classic !== null) {
    return Math.min(aspect, classic);
  }
  if (aspect !== null) {
    return aspect;
  }
  if (classic !== null) {
    return classic;
  }
  return 1.0;
}

export function extractLivenessMetrics(face: Face): {
  ear: number;
  mar: number;
  yawRatio: number;
  avgEyeOpen?: number;
  smilingProbability?: number;
} {
  const leftEyeContour = face.contours?.leftEye?.points ?? [];
  const rightEyeContour = face.contours?.rightEye?.points ?? [];

  const leftEar = contourToEarLandmarks(leftEyeContour);
  const rightEar = contourToEarLandmarks(rightEyeContour);

  const leftEarVal = combineEyeAspect(leftEyeContour, leftEar);
  const rightEarVal = combineEyeAspect(rightEyeContour, rightEar);
  const ear = (leftEarVal + rightEarVal) / 2;
  const avgEyeOpen = averageEyeOpenProbability(face);

  const landmarks = face.landmarks;
  const mouthTop = mouthTopFromFace(face);
  let mar = 0.0;

  if (
    landmarks?.mouthLeft?.position &&
    landmarks?.mouthRight?.position &&
    landmarks?.mouthBottom?.position &&
    mouthTop
  ) {
    mar = livenessService.calculateMAR([
      toLandmark(landmarks.mouthLeft.position),
      toLandmark(landmarks.mouthRight.position),
      toLandmark(mouthTop),
      toLandmark(landmarks.mouthBottom.position),
    ]);
  }

  const rotationY = face.rotationY ?? 0;
  let yawRatio = 1.0;
  if (
    landmarks?.leftCheek?.position &&
    landmarks?.noseBase?.position &&
    landmarks?.rightCheek?.position
  ) {
    yawRatio = livenessService.calculateYawRatio([
      toLandmark(landmarks.leftCheek.position),
      toLandmark(landmarks.noseBase.position),
      toLandmark(landmarks.rightCheek.position),
    ]);
  }

  // Front-camera cheek ratios often stay near 1.0–1.3 even when the head turns.
  if (Math.abs(rotationY) >= 10) {
    yawRatio = rotationY < 0 ? 0.5 : 1.8;
  } else if (
    yawRatio === 1.0 &&
    Math.abs(rotationY) > 8
  ) {
    yawRatio = rotationY < 0 ? 1.75 : 0.45;
  }

  return {
    ear,
    mar,
    yawRatio,
    avgEyeOpen,
    smilingProbability: face.smilingProbability,
    rotationY,
  };
}

export {getMlKitFaceDiagnostics} from './detectFaceInPhoto';
