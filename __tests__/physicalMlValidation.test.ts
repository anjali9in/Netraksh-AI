import type {Face} from '@react-native-ml-kit/face-detection';
import FaceDetection from '@react-native-ml-kit/face-detection';

import {
  runModelLoadValidation,
  summarizePhysicalValidation,
  validatePhysicalCapture,
  type PhysicalCaptureValidationResult,
} from '../src/ai/physicalMlValidation';
import type {CapturedFaceImage} from '../src/types/CameraTypes';

const face = {
  frame: {left: 100, top: 80, width: 200, height: 260},
  rotationX: 0,
  rotationY: 18,
  rotationZ: 0,
  leftEyeOpenProbability: 0.82,
  rightEyeOpenProbability: 0.8,
  smilingProbability: 0.2,
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

const cameraImage: CapturedFaceImage = {
  path: '/tmp/face.jpg',
  uri: 'file:///tmp/face.jpg',
  capturedAt: '2026-06-05T00:00:00.000Z',
  source: 'camera',
  width: 640,
  height: 960,
  orientation: 'portrait',
};

describe('physical ML validation harness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (FaceDetection.detect as jest.Mock).mockResolvedValue([face]);
  });

  it('checks MobileFaceNet and MiniFASNet model loading', async () => {
    const results = await runModelLoadValidation();

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({modelName: 'MobileFaceNet', status: 'PASS'}),
        expect.objectContaining({
          modelName: 'MiniFASNet-V1-80x80',
          status: 'PASS',
        }),
      ]),
    );
  });

  it('validates a real camera capture through detection, embedding, anti-spoof, and matching', async () => {
    const result = await validatePhysicalCapture(cameraImage, 'head-turn');

    expect(result.status).toBe('PASS');
    expect(result.detection.faceCount).toBe(1);
    expect(result.embedding?.dimensions).toBe(128);
    expect(result.antiSpoof?.isLive).toBe(true);
    expect(result.matching?.score).toBeGreaterThan(0.99);
    expect(result.livenessMetrics?.rotationY).toBe(18);
  });

  it('rejects mock captures for physical validation', async () => {
    const result = await validatePhysicalCapture(
      {
        path: 'mock://face.jpg',
        uri: 'mock://face.jpg',
        capturedAt: '2026-06-05T00:00:00.000Z',
        source: 'mock',
      },
      'neutral',
    );

    expect(result.status).toBe('FAIL');
    expect(result.errors[0]).toContain('real camera capture');
  });

  it('summarizes threshold candidates from scenario samples', () => {
    const baseResult = {
      capturedAt: '2026-06-05T00:00:00.000Z',
      imagePath: '/tmp/face.jpg',
      imageSource: 'camera',
      status: 'PASS',
      totalLatencyMs: 50,
      errors: [],
      detection: {status: 'PASS', latencyMs: 10, faceCount: 1},
    } satisfies Partial<PhysicalCaptureValidationResult>;
    const summary = summarizePhysicalValidation([
      {
        ...baseResult,
        scenario: 'neutral',
        livenessMetrics: {ear: 0.32, mar: 0.2, yawRatio: 1, avgEyeOpen: 0.9},
      } as PhysicalCaptureValidationResult,
      {
        ...baseResult,
        scenario: 'blink',
        livenessMetrics: {ear: 0.12, mar: 0.2, yawRatio: 1, avgEyeOpen: 0.2},
      } as PhysicalCaptureValidationResult,
      {
        ...baseResult,
        scenario: 'head-turn',
        livenessMetrics: {ear: 0.3, mar: 0.2, yawRatio: 0.5, rotationY: 18},
      } as PhysicalCaptureValidationResult,
    ]);

    expect(summary.suggestedBlinkEyeOpenClosed).toBe(0.55);
    expect(summary.suggestedBlinkEarClosed).toBe(0.22);
    expect(summary.suggestedHeadTurnRotationDegrees).toBe(13.5);
    expect(summary.suggestedHeadTurnRightYawRatio).toBe(0.55);
  });
});
