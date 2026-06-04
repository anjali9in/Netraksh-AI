import type {Face} from '@react-native-ml-kit/face-detection';

import {evaluateMlKitFaceAlignment} from '../src/services/liveness/mlKitFaceAlignment';

describe('mlKitFaceAlignment', () => {
  it('reports aligned when the face is centered and large enough', () => {
    const face = {
      frame: {left: 120, top: 200, width: 240, height: 300},
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
    } as Face;

    const result = evaluateMlKitFaceAlignment(face, 480, 640);
    expect(result.hint).toBe('aligned');
    expect(result.detected).toBe(true);
  });

  it('reports too_small when the face bounding box is tiny', () => {
    const face = {
      frame: {left: 200, top: 280, width: 40, height: 50},
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
    } as Face;

    const result = evaluateMlKitFaceAlignment(face, 480, 640);
    expect(result.hint).toBe('too_small');
  });
});
