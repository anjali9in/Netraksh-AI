import ImageResizer from '@bam.tech/react-native-image-resizer';
import RNFS from 'react-native-fs';
import type {Orientation} from 'react-native-vision-camera';

import {
  getImageResizerRotationDegrees,
  type PhotoOrientationOptions,
} from './cameraOrientation';
import {toFileUri} from './fileUtils';

export interface NormalizedPhoto {
  path: string;
  uri: string;
  width: number;
  height: number;
}

/**
 * Bakes EXIF orientation into the JPEG so previews and TFLite see an upright portrait image.
 */
export async function normalizeCapturedPhoto(
  path: string,
  width: number,
  height: number,
  orientation?: Orientation,
  options?: PhotoOrientationOptions,
): Promise<NormalizedPhoto> {
  const rotation = getImageResizerRotationDegrees(orientation, options);

  if (rotation === 0) {
    return {
      path,
      uri: toFileUri(path),
      width,
      height,
    };
  }

  const result = await ImageResizer.createResizedImage(
    toFileUri(path),
    width,
    height,
    'JPEG',
    95,
    rotation,
    undefined,
    false,
    {mode: 'contain'},
  );

  const normalizedPath =
    result.path ?? result.uri.replace(/^file:\/\//, '');

  if (normalizedPath !== path) {
    RNFS.unlink(path).catch(() => undefined);
  }

  return {
    path: normalizedPath,
    uri: result.uri.startsWith('file://')
      ? result.uri
      : toFileUri(normalizedPath),
    width: result.width,
    height: result.height,
  };
}
