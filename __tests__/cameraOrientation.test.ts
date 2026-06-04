import {Platform} from 'react-native';

import {getImageResizerRotationDegrees} from '../src/utils/cameraOrientation';

describe('getImageResizerRotationDegrees', () => {
  const originalOs = Platform.OS;

  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', {get: () => 'android'});
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', {get: () => originalOs});
  });

  it('uses swapped landscape rotation for Android front camera', () => {
    expect(
      getImageResizerRotationDegrees('landscape-left', {
        isFrontCamera: true,
      }),
    ).toBe(270);
    expect(
      getImageResizerRotationDegrees('landscape-right', {
        isFrontCamera: true,
      }),
    ).toBe(90);
  });

  it('uses standard landscape rotation for back camera', () => {
    expect(
      getImageResizerRotationDegrees('landscape-left', {
        isFrontCamera: false,
      }),
    ).toBe(90);
    expect(
      getImageResizerRotationDegrees('landscape-right', {
        isFrontCamera: false,
      }),
    ).toBe(270);
  });

  it('uses swapped landscape rotation for iOS front camera captures', () => {
    Object.defineProperty(Platform, 'OS', {get: () => 'ios'});

    expect(
      getImageResizerRotationDegrees('landscape-left', {
        height: 1080,
        isFrontCamera: true,
        width: 1920,
      }),
    ).toBe(270);
    expect(
      getImageResizerRotationDegrees('landscape-right', {
        height: 1080,
        isFrontCamera: true,
        width: 1920,
      }),
    ).toBe(90);
  });

  it('rotates upside-down portrait metadata by 180', () => {
    expect(getImageResizerRotationDegrees('portrait-upside-down')).toBe(180);
  });

  it('rotates portrait captures when the JPEG dimensions are landscape', () => {
    Object.defineProperty(Platform, 'OS', {get: () => 'ios'});

    expect(
      getImageResizerRotationDegrees('portrait', {
        height: 3024,
        isFrontCamera: true,
        width: 4032,
      }),
    ).toBe(270);
  });

  it('rotates landscape-sized captures even when orientation metadata is missing', () => {
    Object.defineProperty(Platform, 'OS', {get: () => 'ios'});

    expect(
      getImageResizerRotationDegrees(undefined, {
        height: 3024,
        isFrontCamera: true,
        width: 4032,
      }),
    ).toBe(270);
  });
});
