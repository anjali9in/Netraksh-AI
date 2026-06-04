import ImageResizer from '@bam.tech/react-native-image-resizer';
import {decode} from 'jpeg-js';
import RNFS from 'react-native-fs';

import {decodeBase64ToUint8Array} from '../utils/base64';
import {toFileUri} from '../utils/fileUtils';

export type RawPixelFormat = 'RGBA';

export interface RawPixelData {
  buffer: ArrayBuffer;
  width: number;
  height: number;
  pixelFormat: RawPixelFormat;
}

function stripFileScheme(uriOrPath: string): string {
  return uriOrPath.replace(/^file:\/\//, '');
}

/**
 * Loads a local image, resizes it natively, and returns RGBA pixels for TFLite preprocessing.
 * Compatible with React Native 0.72 (does not require Nitro Modules).
 */
export async function loadRawPixelsFromImagePath(
  imagePath: string,
  targetWidth: number,
  targetHeight: number,
): Promise<RawPixelData> {
  if (!imagePath || imagePath.startsWith('mock://')) {
    throw new Error(`Invalid image path for pixel extraction: ${imagePath}`);
  }

  const uri = imagePath.startsWith('file://') ? imagePath : toFileUri(imagePath);

  const resized = await ImageResizer.createResizedImage(
    uri,
    targetWidth,
    targetHeight,
    'JPEG',
    90,
    0,
    undefined,
    false,
    {
      // Camera frames are 4:3; default resize keeps aspect ratio (e.g. 160×120).
      mode: targetWidth === targetHeight ? 'cover' : 'contain',
    },
  );

  const filePath = resized.path ?? stripFileScheme(resized.uri);

  try {
    const base64 = await RNFS.readFile(filePath, 'base64');
    const jpegBytes = decodeBase64ToUint8Array(base64);
    const decoded = decode(jpegBytes, {useTArray: true});
    const pixels = new Uint8Array(decoded.data);

    return {
      buffer: pixels.buffer,
      width: decoded.width,
      height: decoded.height,
      pixelFormat: 'RGBA',
    };
  } finally {
    RNFS.unlink(filePath).catch(() => undefined);
  }
}
