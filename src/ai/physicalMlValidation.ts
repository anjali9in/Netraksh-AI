import type {Face} from '@react-native-ml-kit/face-detection';
import type {Orientation} from 'react-native-vision-camera';

import type {CapturedFaceImage} from '../types/CameraTypes';
import {cosineSimilarity} from '../utils/similarity';
import {
  ANTI_SPOOF_MODEL,
  FACE_RECOGNITION_MODEL,
} from './modelConfig';
import {faceEmbeddingGenerator} from './faceEmbedding';
import {miniFasAntiSpoofing} from './miniFasAntiSpoofing';
import {
  detectFacesInPhoto,
  getMlKitFaceDiagnostics,
  type MlKitFaceDiagnostics,
} from '../services/liveness/detectFaceInPhoto';
import {extractLivenessMetrics} from '../services/liveness/mlKitLivenessMetrics';

export type CaptureScenario = 'neutral' | 'blink' | 'head-turn';
export type ValidationStatus = 'PASS' | 'FAIL';

export type TimedCheck = {
  status: ValidationStatus;
  latencyMs: number;
  error?: string;
};

export type ModelLoadValidationResult = TimedCheck & {
  modelName: string;
  modelPath: string;
};

export type CaptureLivenessMetrics = {
  ear: number;
  mar: number;
  yawRatio: number;
  avgEyeOpen?: number;
  smilingProbability?: number;
  rotationY?: number;
};

export type PhysicalCaptureValidationResult = {
  scenario: CaptureScenario;
  capturedAt: string;
  imagePath: string;
  imageSource: CapturedFaceImage['source'];
  status: ValidationStatus;
  totalLatencyMs: number;
  errors: string[];
  detection: TimedCheck & {
    faceCount: number;
    diagnostics?: MlKitFaceDiagnostics;
  };
  livenessMetrics?: CaptureLivenessMetrics;
  embedding?: TimedCheck & {
    dimensions: number;
  };
  antiSpoof?: TimedCheck & {
    isLive: boolean;
    liveScore: number;
    label: number;
  };
  matching?: TimedCheck & {
    score: number;
  };
};

export type ThresholdCandidateSummary = {
  sampleCount: number;
  neutralSamples: number;
  blinkSamples: number;
  headTurnSamples: number;
  suggestedBlinkEyeOpenClosed?: number;
  suggestedBlinkEarClosed?: number;
  suggestedHeadTurnRotationDegrees?: number;
  suggestedHeadTurnRightYawRatio?: number;
  suggestedHeadTurnLeftYawRatio?: number;
  notes: string[];
};

type Measured<T> = {
  latencyMs: number;
  value: T;
};

async function measure<T>(operation: () => Promise<T>): Promise<Measured<T>> {
  const startedAt = Date.now();
  const value = await operation();
  return {
    latencyMs: Date.now() - startedAt,
    value,
  };
}

function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function modelPathLabel(pathValue: unknown): string {
  if (typeof pathValue === 'string') {
    return pathValue;
  }
  return String(pathValue);
}

export async function runModelLoadValidation(): Promise<
  ModelLoadValidationResult[]
> {
  const checks = [
    {
      modelName: FACE_RECOGNITION_MODEL.modelName,
      modelPath: modelPathLabel(FACE_RECOGNITION_MODEL.modelPath),
      load: () => faceEmbeddingGenerator.loadModel(),
    },
    {
      modelName: ANTI_SPOOF_MODEL.modelName,
      modelPath: modelPathLabel(ANTI_SPOOF_MODEL.modelPath),
      load: () => miniFasAntiSpoofing.loadModel(),
    },
  ];

  return Promise.all(
    checks.map(async check => {
      const startedAt = Date.now();
      try {
        await check.load();
        return {
          modelName: check.modelName,
          modelPath: check.modelPath,
          status: 'PASS' as const,
          latencyMs: Date.now() - startedAt,
        };
      } catch (error) {
        return {
          modelName: check.modelName,
          modelPath: check.modelPath,
          status: 'FAIL' as const,
          latencyMs: Date.now() - startedAt,
          error: asErrorMessage(error),
        };
      }
    }),
  );
}

export async function validatePhysicalCapture(
  image: CapturedFaceImage,
  scenario: CaptureScenario,
): Promise<PhysicalCaptureValidationResult> {
  const totalStartedAt = Date.now();
  const errors: string[] = [];

  const result: PhysicalCaptureValidationResult = {
    scenario,
    capturedAt: new Date().toISOString(),
    imagePath: image.path,
    imageSource: image.source,
    status: 'FAIL',
    totalLatencyMs: 0,
    errors,
    detection: {
      status: 'FAIL',
      latencyMs: 0,
      faceCount: 0,
    },
  };

  if (image.source !== 'camera') {
    errors.push('Physical validation requires a real camera capture.');
    result.totalLatencyMs = Date.now() - totalStartedAt;
    return result;
  }

  if (!image.width || !image.height) {
    errors.push('Captured image dimensions are required for ML validation.');
    result.totalLatencyMs = Date.now() - totalStartedAt;
    return result;
  }

  let face: Face | undefined;
  try {
    const detected = await measure(() =>
      detectFacesInPhoto(
        image.path,
        image.width ?? 0,
        image.height ?? 0,
        image.orientation as Orientation | undefined,
        undefined,
        image.isMirrored,
      ),
    );
    face = detected.value[0];
    result.detection = {
      status: detected.value.length === 1 ? 'PASS' : 'FAIL',
      latencyMs: detected.latencyMs,
      faceCount: detected.value.length,
      diagnostics: face ? getMlKitFaceDiagnostics(face) : undefined,
    };

    if (detected.value.length !== 1 || !face) {
      errors.push(`Expected exactly one face, detected ${detected.value.length}.`);
      result.totalLatencyMs = Date.now() - totalStartedAt;
      return result;
    }
  } catch (error) {
    errors.push(`ML Kit detection failed: ${asErrorMessage(error)}`);
    result.detection = {
      status: 'FAIL',
      latencyMs: Date.now() - totalStartedAt,
      faceCount: 0,
    };
    result.totalLatencyMs = Date.now() - totalStartedAt;
    return result;
  }

  result.livenessMetrics = extractLivenessMetrics(face);

  try {
    const referenceEmbedding = await measure(() =>
      faceEmbeddingGenerator.generateEmbedding(image.path),
    );
    result.embedding = {
      status:
        referenceEmbedding.value.length ===
        FACE_RECOGNITION_MODEL.embeddingDimension
          ? 'PASS'
          : 'FAIL',
      latencyMs: referenceEmbedding.latencyMs,
      dimensions: referenceEmbedding.value.length,
    };

    if (result.embedding.status === 'FAIL') {
      errors.push(
        `MobileFaceNet produced ${referenceEmbedding.value.length} dimensions.`,
      );
    }

    const matchedEmbedding = await measure(async () => {
      const currentEmbedding = await faceEmbeddingGenerator.generateEmbedding(
        image.path,
      );
      return cosineSimilarity(referenceEmbedding.value, currentEmbedding);
    });
    result.matching = {
      status: 'PASS',
      latencyMs: matchedEmbedding.latencyMs,
      score: matchedEmbedding.value,
    };
  } catch (error) {
    errors.push(`MobileFaceNet validation failed: ${asErrorMessage(error)}`);
    result.embedding = {
      status: 'FAIL',
      latencyMs: 0,
      dimensions: 0,
      error: asErrorMessage(error),
    };
  }

  try {
    const spoof = await measure(() =>
      miniFasAntiSpoofing.verify(
        image.path,
        face,
        image.width ?? 0,
        image.height ?? 0,
      ),
    );
    result.antiSpoof = {
      status: spoof.value.isLive ? 'PASS' : 'FAIL',
      latencyMs: spoof.latencyMs,
      isLive: spoof.value.isLive,
      liveScore: spoof.value.liveScore,
      label: spoof.value.label,
    };

    if (!spoof.value.isLive) {
      errors.push('MiniFASNet classified this capture as spoof.');
    }
  } catch (error) {
    errors.push(`MiniFASNet validation failed: ${asErrorMessage(error)}`);
    result.antiSpoof = {
      status: 'FAIL',
      latencyMs: 0,
      isLive: false,
      liveScore: 0,
      label: -1,
      error: asErrorMessage(error),
    };
  }

  result.totalLatencyMs = Date.now() - totalStartedAt;
  result.status =
    errors.length === 0 &&
    result.detection.status === 'PASS' &&
    result.embedding?.status === 'PASS' &&
    result.antiSpoof?.status === 'PASS' &&
    result.matching?.status === 'PASS'
      ? 'PASS'
      : 'FAIL';

  return result;
}

function average(values: number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundThreshold(value: number): number {
  return Math.round(value * 100) / 100;
}

export function summarizePhysicalValidation(
  results: PhysicalCaptureValidationResult[],
): ThresholdCandidateSummary {
  const passed = results.filter(
    result => result.status === 'PASS' && result.livenessMetrics,
  );
  const byScenario = (scenario: CaptureScenario) =>
    passed.filter(result => result.scenario === scenario);
  const neutral = byScenario('neutral');
  const blink = byScenario('blink');
  const headTurn = byScenario('head-turn');
  const notes: string[] = [];

  const neutralEyeOpen = average(
    neutral
      .map(result => result.livenessMetrics?.avgEyeOpen)
      .filter((value): value is number => value !== undefined),
  );
  const blinkEyeOpen = average(
    blink
      .map(result => result.livenessMetrics?.avgEyeOpen)
      .filter((value): value is number => value !== undefined),
  );
  const neutralEar = average(
    neutral
      .map(result => result.livenessMetrics?.ear)
      .filter((value): value is number => value !== undefined),
  );
  const blinkEar = average(
    blink
      .map(result => result.livenessMetrics?.ear)
      .filter((value): value is number => value !== undefined),
  );
  const headRotations = headTurn
    .map(result => Math.abs(result.livenessMetrics?.rotationY ?? 0))
    .filter(value => value > 0);
  const headYawValues = headTurn
    .map(result => result.livenessMetrics?.yawRatio)
    .filter((value): value is number => value !== undefined);

  let suggestedBlinkEyeOpenClosed: number | undefined;
  if (neutralEyeOpen !== undefined && blinkEyeOpen !== undefined) {
    suggestedBlinkEyeOpenClosed = roundThreshold(
      (neutralEyeOpen + blinkEyeOpen) / 2,
    );
  } else {
    notes.push('Capture neutral and blink samples to tune eye-open threshold.');
  }

  let suggestedBlinkEarClosed: number | undefined;
  if (neutralEar !== undefined && blinkEar !== undefined) {
    suggestedBlinkEarClosed = roundThreshold((neutralEar + blinkEar) / 2);
  } else {
    notes.push('Capture neutral and blink samples to tune EAR threshold.');
  }

  let suggestedHeadTurnRotationDegrees: number | undefined;
  if (headRotations.length > 0) {
    suggestedHeadTurnRotationDegrees = roundThreshold(
      Math.max(8, Math.min(...headRotations) * 0.75),
    );
  } else {
    notes.push('Capture head-turn samples to tune rotation threshold.');
  }

  const minHeadYaw = headYawValues.length ? Math.min(...headYawValues) : undefined;
  const maxHeadYaw = headYawValues.length ? Math.max(...headYawValues) : undefined;
  const suggestedHeadTurnRightYawRatio =
    minHeadYaw !== undefined && minHeadYaw < 1
      ? roundThreshold(Math.max(0.35, minHeadYaw * 1.1))
      : undefined;
  const suggestedHeadTurnLeftYawRatio =
    maxHeadYaw !== undefined && maxHeadYaw > 1
      ? roundThreshold(Math.min(1.9, maxHeadYaw * 0.9))
      : undefined;

  if (
    suggestedHeadTurnRightYawRatio === undefined &&
    suggestedHeadTurnLeftYawRatio === undefined
  ) {
    notes.push('Capture left and right head-turn samples to tune yaw thresholds.');
  }

  return {
    sampleCount: passed.length,
    neutralSamples: neutral.length,
    blinkSamples: blink.length,
    headTurnSamples: headTurn.length,
    suggestedBlinkEyeOpenClosed,
    suggestedBlinkEarClosed,
    suggestedHeadTurnRotationDegrees,
    suggestedHeadTurnRightYawRatio,
    suggestedHeadTurnLeftYawRatio,
    notes,
  };
}
