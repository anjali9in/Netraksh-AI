import type {Face} from '@react-native-ml-kit/face-detection';

import {extractLivenessMetrics} from '../src/services/liveness/mlKitLivenessMetrics';

describe('mlKitLivenessMetrics', () => {
  it('computes EAR, MAR, and yaw from ML Kit landmarks and contours', () => {
    const face = {
      frame: {left: 100, top: 80, width: 200, height: 260},
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      contours: {
        leftEye: {
          points: [
            {x: 140, y: 150},
            {x: 150, y: 145},
            {x: 160, y: 145},
            {x: 170, y: 150},
            {x: 160, y: 155},
            {x: 150, y: 155},
          ],
        },
        rightEye: {
          points: [
            {x: 220, y: 150},
            {x: 230, y: 145},
            {x: 240, y: 145},
            {x: 250, y: 150},
            {x: 240, y: 155},
            {x: 230, y: 155},
          ],
        },
      },
      landmarks: {
        mouthLeft: {position: {x: 170, y: 220}},
        mouthRight: {position: {x: 230, y: 220}},
        mouthBottom: {position: {x: 200, y: 240}},
        leftCheek: {position: {x: 130, y: 200}},
        noseBase: {position: {x: 200, y: 200}},
        rightCheek: {position: {x: 270, y: 200}},
      },
    } as Face;

    const metrics = extractLivenessMetrics(face);

    expect(metrics.ear).toBeGreaterThan(0);
    expect(metrics.ear).toBeLessThan(1);
    expect(metrics.mar).toBeGreaterThan(0);
    expect(metrics.yawRatio).toBeCloseTo(1.0, 1);
  });
});
