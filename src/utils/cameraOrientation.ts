import type {Orientation} from 'react-native-vision-camera';

export type PhotoOrientationOptions = {
  /** Front/selfie camera (default for face capture). */
  isFrontCamera?: boolean;
  height?: number;
  width?: number;
};

/**
 * Maps Vision Camera photo orientation to degrees for @bam.tech/react-native-image-resizer.
 * Front cameras often need the opposite 90°/270° swap vs back camera.
 */
export function getImageResizerRotationDegrees(
  orientation?: Orientation | string,
  options: PhotoOrientationOptions = {},
): number {
  const {height, isFrontCamera = true, width} = options;
  const invertLandscape = isFrontCamera;

  switch (orientation) {
    case 'landscape-left':
      return invertLandscape ? 270 : 90;
    case 'landscape-right':
      return invertLandscape ? 90 : 270;
    case 'portrait-upside-down':
      return 180;
    default:
      if (
        typeof width === 'number' &&
        typeof height === 'number' &&
        width > height
      ) {
        return invertLandscape ? 270 : 90;
      }
      return 0;
  }
}
