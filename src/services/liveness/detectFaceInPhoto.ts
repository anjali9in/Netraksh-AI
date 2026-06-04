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
  const upright = await normalizeCapturedPhoto(path, width, height, orientation, {
    isFrontCamera,
    keepSourceFile: true,
  });

  try {
    return await FaceDetection.detect(
      toFileUri(upright.path),
      options ?? ML_KIT_FACE_DETECT_OPTIONS,
    );
  } finally {
    if (upright.path !== path) {
      await RNFS.unlink(upright.path).catch(() => undefined);
    }
  }
}
