import {analyzeEnrollmentQualityPixels} from '../src/ai/enrollmentQuality';

function buildPixels(
  width: number,
  height: number,
  valueForPixel: (x: number, y: number) => number,
): Uint8Array {
  const data = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const value = valueForPixel(x, y);
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }

  return data;
}

describe('enrollment quality analysis', () => {
  it('passes a sharp, evenly exposed capture', () => {
    const data = buildPixels(32, 32, (x, y) =>
      (x + y) % 2 === 0 ? 90 : 170,
    );

    const result = analyzeEnrollmentQualityPixels(data, 32, 32);

    expect(result.passed).toBe(true);
    expect(result.brightness).toBe(130);
    expect(result.sharpness).toBeGreaterThanOrEqual(0.45);
    expect(result.exposure).toBe(1);
  });

  it('fails a dark capture', () => {
    const data = buildPixels(32, 32, () => 20);

    const result = analyzeEnrollmentQualityPixels(data, 32, 32);

    expect(result.passed).toBe(false);
    expect(result.reason).toContain('too low');
  });

  it('fails an overexposed capture', () => {
    const data = buildPixels(32, 32, () => 250);

    const result = analyzeEnrollmentQualityPixels(data, 32, 32);

    expect(result.passed).toBe(false);
    expect(result.reason).toContain('too harsh');
  });

  it('fails a smooth blurry capture even when brightness is acceptable', () => {
    const data = buildPixels(32, 32, () => 128);

    const result = analyzeEnrollmentQualityPixels(data, 32, 32);

    expect(result.passed).toBe(false);
    expect(result.reason).toContain('blurry');
    expect(result.sharpness).toBe(0);
  });
});
