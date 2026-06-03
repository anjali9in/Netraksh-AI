import ImageResizer from '@bam.tech/react-native-image-resizer';
import {decode} from 'jpeg-js';
import RNFS from 'react-native-fs';

import {toFileUri} from '../utils/fileUtils';

export type RawPixelFormat = 'RGBA';

export interface RawPixelData {
  buffer: ArrayBuffer;
  width: number;
  height: number;
  pixelFormat: RawPixelFormat;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const atobFn = global.atob;
  if (!atobFn) {
    throw new Error('base64 decoding is not available in this runtime');
  }

  const binary = atobFn(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
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
  );

  const filePath = resized.path ?? stripFileScheme(resized.uri);

  try {
    const base64 = await RNFS.readFile(filePath, 'base64');
    const jpegBytes = base64ToUint8Array(base64);
    const decoded = decode(jpegBytes, {useTArray: true});

    if (
      decoded.width !== targetWidth ||
      decoded.height !== targetHeight
    ) {
      throw new Error(
        `Resized image dimensions ${decoded.width}x${decoded.height} do not match expected ${targetWidth}x${targetHeight}`,
      );
    }

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
