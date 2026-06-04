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
  displayRotationDegrees: number;
}

/**
 * Bakes EXIF orientation into the JPEG so previews and TFLite see an upright portrait image.
 */
export type NormalizeCapturedPhotoOptions = PhotoOrientationOptions & {
  /** Keep the camera JPEG after writing a rotated copy (e.g. per-frame ML Kit). */
  keepSourceFile?: boolean;
  maxDimension?: number;
};

export async function normalizeCapturedPhoto(
  path: string,
  width: number,
  height: number,
  orientation?: Orientation,
  options?: NormalizeCapturedPhotoOptions,
): Promise<NormalizedPhoto> {
  const rotation = getImageResizerRotationDegrees(orientation, {
    ...options,
    height,
    width,
  });
  const willSwapDimensions = rotation === 90 || rotation === 270;
  let outputWidth = willSwapDimensions ? height : width;
  let outputHeight = willSwapDimensions ? width : height;

  let shouldResize = rotation !== 0;

  if (options?.maxDimension) {
    const maxDim = options.maxDimension;
    const currentMax = Math.max(outputWidth, outputHeight);
    if (currentMax > maxDim) {
      const scale = maxDim / currentMax;
      outputWidth = Math.round(outputWidth * scale);
      outputHeight = Math.round(outputHeight * scale);
      shouldResize = true;
    }
  }

  if (!shouldResize) {
    return {
      path,
      uri: toFileUri(path),
      width,
      height,
      displayRotationDegrees: width > height ? 90 : 0,
    };
  }

  const result = await ImageResizer.createResizedImage(
    toFileUri(path),
    outputWidth,
    outputHeight,
    'JPEG',
    95,
    rotation,
    undefined,
    false,
    {mode: 'contain'},
  );

  const normalizedPath =
    result.path ?? result.uri.replace(/^file:\/\//, '');

  if (normalizedPath !== path && !options?.keepSourceFile) {
    RNFS.unlink(path).catch(() => undefined);
  }

  const normalizedWidth = result.width ?? outputWidth;
  const normalizedHeight = result.height ?? outputHeight;

  return {
    path: normalizedPath,
    uri: result.uri.startsWith('file://')
      ? result.uri
      : toFileUri(normalizedPath),
    width: normalizedWidth,
    height: normalizedHeight,
    displayRotationDegrees: normalizedWidth > normalizedHeight ? 90 : 0,
  };
}
