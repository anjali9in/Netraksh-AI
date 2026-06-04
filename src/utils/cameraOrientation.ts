import {Platform} from 'react-native';
import type {Orientation} from 'react-native-vision-camera';

export type PhotoOrientationOptions = {
  /** Front/selfie camera (default for face capture). */
  isFrontCamera?: boolean;
};

/**
 * Maps Vision Camera photo orientation to degrees for @bam.tech/react-native-image-resizer.
 * Android front cameras (e.g. Realme) often need the opposite 90°/270° swap vs back camera.
 */
export function getImageResizerRotationDegrees(
  orientation?: Orientation | string,
  options: PhotoOrientationOptions = {},
): number {
  const {isFrontCamera = true} = options;
  const invertLandscape =
    Platform.OS === 'android' && isFrontCamera;

  switch (orientation) {
    case 'landscape-left':
      return invertLandscape ? 270 : 90;
    case 'landscape-right':
      return invertLandscape ? 90 : 270;
    case 'portrait-upside-down':
      return 180;
    case 'portrait':
    default:
      return 0;
  }
}
