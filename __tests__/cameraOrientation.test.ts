import {Platform} from 'react-native';

import {getImageResizerRotationDegrees} from '../src/utils/cameraOrientation';

describe('getImageResizerRotationDegrees', () => {
  const originalOs = Platform.OS;

  beforeAll(() => {
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

  it('rotates upside-down portrait metadata by 180', () => {
    expect(getImageResizerRotationDegrees('portrait-upside-down')).toBe(180);
  });
});
