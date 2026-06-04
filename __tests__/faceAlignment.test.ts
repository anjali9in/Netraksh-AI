import {
  analyzePixels,
  type FaceAlignmentHint,
} from '../src/ai/faceAlignment';

function fillOvalSkin(
  width: number,
  height: number,
): Uint8Array {
  const data = new Uint8Array(width * height * 4);
  const cx = width * 0.5;
  const cy = height * 0.48;
  const rx = width * 0.3;
  const ry = height * 0.32;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const inOval =
        ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
      if (inOval) {
        data[i] = 210;
        data[i + 1] = 160;
        data[i + 2] = 130;
        data[i + 3] = 255;
      } else {
        data[i] = 40;
        data[i + 1] = 50;
        data[i + 2] = 60;
        data[i + 3] = 255;
      }
    }
  }

  return data;
}

describe('faceAlignment (no extra ML model)', () => {
  it('reports no_face when the oval has no skin-like region', () => {
    const data = new Uint8Array(160 * 160 * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 90;
      data[i + 1] = 95;
      data[i + 2] = 100;
      data[i + 3] = 255;
    }

    const result = analyzePixels(data, 160, 160);

    expect(result.hint).toBe('no_face');
    expect(result.detected).toBe(false);
  });

  it('reports aligned when skin fills the target oval', () => {
    const data = fillOvalSkin(160, 160);

    const result = analyzePixels(data, 160, 160);

    expect(result.hint).toBe('aligned');
    expect(result.detected).toBe(true);
  });

  it('only exposes hints supported without a detector model', () => {
    const allowed: FaceAlignmentHint[] = [
      'no_face',
      'off_center',
      'too_small',
      'too_dark',
      'too_bright',
      'aligned',
    ];
    const data = fillOvalSkin(160, 160);
    const result = analyzePixels(data, 160, 160);
    expect(allowed).toContain(result.hint);
  });
});
