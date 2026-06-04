import FaceDetection, {type Face} from '@react-native-ml-kit/face-detection';
import type {Orientation} from 'react-native-vision-camera';
import RNFS from 'react-native-fs';

import {normalizeCapturedPhoto} from '../../utils/normalizeCapturedPhoto';
import {toFileUri} from '../../utils/fileUtils';

/** All modes on + fast — contours/classification require these flags on Android. */
export const ML_KIT_FACE_DETECT_OPTIONS = {
  performanceMode: 'fast' as const,
  landmarkMode: 'all' as const,
  contourMode: 'all' as const,
  classificationMode: 'all' as const,
  minFaceSize: 0.1,
};

export type MlKitFaceDiagnostics = {
  faceCount: number;
  leftEyeContourPoints: number;
  rightEyeContourPoints: number;
  landmarkKeys: string[];
  avgEyeOpen?: number;
  smilingProbability?: number;
  rotationY: number;
};

export function getMlKitFaceDiagnostics(face: Face): MlKitFaceDiagnostics {
  const left = face.leftEyeOpenProbability;
  const right = face.rightEyeOpenProbability;
  const eyeValues = [left, right].filter(
    (value): value is number => value !== undefined,
  );

  return {
    faceCount: 1,
    leftEyeContourPoints: face.contours?.leftEye?.points?.length ?? 0,
    rightEyeContourPoints: face.contours?.rightEye?.points?.length ?? 0,
    landmarkKeys: face.landmarks ? Object.keys(face.landmarks) : [],
    avgEyeOpen:
      eyeValues.length > 0
        ? eyeValues.reduce((sum, value) => sum + value, 0) / eyeValues.length
        : undefined,
    smilingProbability: face.smilingProbability,
    rotationY: face.rotationY,
  };
}

function scaleFaceUp(face: Face, scale: number): Face {
  if (scale === 1) {
    return face;
  }

  const invScale = 1 / scale;

  const scaledFrame = {
    left: face.frame.left * invScale,
    top: face.frame.top * invScale,
    width: face.frame.width * invScale,
    height: face.frame.height * invScale,
  };

  const scaledLandmarks: any = {};
  if (face.landmarks) {
    const lms = face.landmarks as any;
    for (const key of Object.keys(lms)) {
      const lm = lms[key];
      if (lm?.position) {
        scaledLandmarks[key] = {
          ...lm,
          position: {
            x: lm.position.x * invScale,
            y: lm.position.y * invScale,
          },
        };
      }
    }
  }

  const scaledContours: any = {};
  if (face.contours) {
    const cts = face.contours as any;
    for (const key of Object.keys(cts)) {
      const ct = cts[key];
      if (ct?.points) {
        scaledContours[key] = {
          ...ct,
          points: ct.points.map((pt: any) => ({
            x: pt.x * invScale,
            y: pt.y * invScale,
          })),
        };
      }
    }
  }

  return {
    ...face,
    frame: scaledFrame,
    landmarks: scaledLandmarks,
    contours: scaledContours,
  };
}

/**
 * Runs ML Kit on an upright JPEG so landmarks/contours/classification are reliable.
 */
export async function detectFacesInPhoto(
  path: string,
  width: number,
  height: number,
  orientation?: Orientation,
  options?: typeof ML_KIT_FACE_DETECT_OPTIONS,
  isFrontCamera?: boolean,
): Promise<Face[]> {
  // Downscale the analysis image to a maximum edge of 480 pixels.
  // This drastically speeds up both image rotation/resize (10-20ms instead of 300ms)
  // and ML Kit face detection execution time.
  const maxEdge = 480;
  const currentMax = Math.max(width, height);
  const scale = currentMax > maxEdge ? maxEdge / currentMax : 1;
  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);

  const upright = await normalizeCapturedPhoto(path, targetWidth, targetHeight, orientation, {
    isFrontCamera,
    keepSourceFile: true,
  });

  try {
    const detectedFaces = await FaceDetection.detect(
      toFileUri(upright.path),
      options ?? ML_KIT_FACE_DETECT_OPTIONS,
    );
    return detectedFaces.map(face => scaleFaceUp(face, scale));
  } finally {
    if (upright.path !== path) {
      await RNFS.unlink(upright.path).catch(() => undefined);
    }
  }
}
