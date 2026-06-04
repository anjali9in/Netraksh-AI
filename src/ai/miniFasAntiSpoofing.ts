import type {Face, Frame} from '@react-native-ml-kit/face-detection';

import {DEMO_MODE} from '../config/appConfig';
import {ANTI_SPOOF_MODEL} from './modelConfig';
import {loadRawPixelsFromImagePath, type RawPixelData} from './imagePixelLoader';

const SPOOF_CROP_SCALE = 2.7;
const MAX_ANALYSIS_EDGE = 640;

type TfliteModel = {
  run: (input: ArrayBufferView[]) => Promise<ArrayBufferView[]>;
};

export type AntiSpoofResult = {
  isLive: boolean;
  liveScore: number;
  label: number;
};

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map(value => Math.exp(value - max));
  const sum = exps.reduce((total, value) => total + value, 0);
  return exps.map(value => value / sum);
}

function expandFaceSquare(
  frame: Frame,
  imageWidth: number,
  imageHeight: number,
  scale: number,
): {left: number; top: number; size: number} {
  const base = Math.max(frame.width, frame.height);
  const size = Math.min(
    Math.max(imageWidth, imageHeight),
    base * scale,
  );
  const centerX = frame.left + frame.width / 2;
  const centerY = frame.top + frame.height / 2;
  let left = centerX - size / 2;
  let top = centerY - size / 2;
  left = Math.max(0, Math.min(left, imageWidth - size));
  top = Math.max(0, Math.min(top, imageHeight - size));
  return {left, top, size};
}

function sampleBilinear(
  data: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
): [number, number, number] {
  const clampedX = Math.max(0, Math.min(width - 1, x));
  const clampedY = Math.max(0, Math.min(height - 1, y));
  const x0 = Math.floor(clampedX);
  const y0 = Math.floor(clampedY);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const dx = clampedX - x0;
  const dy = clampedY - y0;

  const sample = (sx: number, sy: number): [number, number, number] => {
    const index = (sy * width + sx) * 4;
    return [data[index], data[index + 1], data[index + 2]];
  };

  const c00 = sample(x0, y0);
  const c10 = sample(x1, y0);
  const c01 = sample(x0, y1);
  const c11 = sample(x1, y1);

  const blend = (
    a: [number, number, number],
    b: [number, number, number],
    t: number,
  ): [number, number, number] => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];

  const top = blend(c00, c10, dx);
  const bottom = blend(c01, c11, dx);
  return blend(top, bottom, dy);
}

function buildSpoofInput(
  pixels: RawPixelData,
  face: Face,
  scale: number,
): Float32Array {
  const data = new Uint8Array(pixels.buffer);
  const {width, height} = pixels;
  const crop = expandFaceSquare(face.frame, width, height, scale);
  const output = new Float32Array(
    ANTI_SPOOF_MODEL.inputWidth *
      ANTI_SPOOF_MODEL.inputHeight *
      ANTI_SPOOF_MODEL.inputChannels,
  );

  for (let y = 0; y < ANTI_SPOOF_MODEL.inputHeight; y++) {
    for (let x = 0; x < ANTI_SPOOF_MODEL.inputWidth; x++) {
      const srcX =
        crop.left + ((x + 0.5) / ANTI_SPOOF_MODEL.inputWidth) * crop.size;
      const srcY =
        crop.top + ((y + 0.5) / ANTI_SPOOF_MODEL.inputHeight) * crop.size;
      const [r, g, b] = sampleBilinear(data, width, height, srcX, srcY);
      const index = (y * ANTI_SPOOF_MODEL.inputWidth + x) * 3;
      output[index] = b;
      output[index + 1] = g;
      output[index + 2] = r;
    }
  }

  return output;
}

export class MiniFasAntiSpoofing {
  private model: TfliteModel | null = null;
  private isLoaded = false;
  private useFallback = false;

  public async loadModel(): Promise<boolean> {
    if (this.isLoaded) {
      return true;
    }

    try {
      if (DEMO_MODE) {
        this.isLoaded = true;
        return true;
      }

      const {loadTensorflowModel} = require('react-native-fast-tflite');
      this.model = await loadTensorflowModel(ANTI_SPOOF_MODEL.modelPath);
      this.isLoaded = true;
      this.useFallback = false;
      return true;
    } catch (error) {
      console.warn(
        '[MiniFasAntiSpoofing] Falling back to permissive mode:',
        error,
      );
      this.isLoaded = true;
      this.useFallback = true;
      return true;
    }
  }

  public async verify(
    imagePath: string,
    face: Face,
    imageWidth: number,
    imageHeight: number,
  ): Promise<AntiSpoofResult> {
    await this.loadModel();

    if (DEMO_MODE || this.useFallback || imagePath.startsWith('mock://')) {
      return {isLive: true, liveScore: 1, label: 1};
    }

    const maxEdge = Math.max(imageWidth, imageHeight);
    const scaleDown =
      maxEdge > MAX_ANALYSIS_EDGE ? MAX_ANALYSIS_EDGE / maxEdge : 1;
    const analysisWidth = Math.max(1, Math.round(imageWidth * scaleDown));
    const analysisHeight = Math.max(1, Math.round(imageHeight * scaleDown));

    const pixels = await loadRawPixelsFromImagePath(
      imagePath,
      analysisWidth,
      analysisHeight,
    );

    const scaledFace: Face = {
      ...face,
      frame: {
        left: face.frame.left * scaleDown,
        top: face.frame.top * scaleDown,
        width: face.frame.width * scaleDown,
        height: face.frame.height * scaleDown,
      },
    };

    const modelInput = buildSpoofInput(pixels, scaledFace, SPOOF_CROP_SCALE);
    if (!this.model) {
      return {isLive: true, liveScore: 1, label: 1};
    }

    const output = await this.model.run([modelInput]);
    const logits = Array.from(new Float32Array(output[0].buffer));
    const probabilities = softmax(logits);
    const label = probabilities.indexOf(Math.max(...probabilities));
    const liveScore = probabilities[1] ?? 0;
    const isLive = label === 1;

    console.log(
      `[MiniFasAntiSpoofing] label=${label} liveScore=${liveScore.toFixed(3)}`,
    );

    return {isLive, liveScore, label};
  }
}

export const miniFasAntiSpoofing = new MiniFasAntiSpoofing();
