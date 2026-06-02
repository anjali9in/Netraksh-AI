import { cosineSimilarity, isFaceMatched } from '../src/utils/similarity';
import { getDynamicThreshold, detectEnvironmentCondition } from '../src/ai/dynamicThreshold';
import { benchmarkEmbeddingSpeed, benchmarkMatchingPipeline } from '../src/ai/benchmark';
import { faceEmbeddingGenerator } from '../src/ai/faceEmbedding';

// ─────────────────────────────────────────────────────────
// TEST 1: Cosine Similarity
// ─────────────────────────────────────────────────────────
describe('Similarity Utility', () => {
  it('should return 1.0 for identical embeddings (perfect match)', () => {
    const vec = [0.5, 0.3, 0.8, 0.1];
    const score = cosineSimilarity(vec, vec);
    expect(score).toBeCloseTo(1.0, 5);
  });

  it('should return a score below threshold for different embeddings (no match)', () => {
    const a = [1.0, 0.0, 0.0];
    const b = [0.0, 1.0, 0.0]; // completely different direction
    const score = cosineSimilarity(a, b);
    expect(score).toBeCloseTo(0.0, 5);
  });

  it('should correctly identify a face as matched above threshold', () => {
    const stored = [0.9, 0.1, 0.2];
    const current = [0.88, 0.12, 0.22]; // very similar
    const matched = isFaceMatched(stored, current);
    expect(matched).toBe(true);
  });

  it('should throw an error if embedding dimensions differ', () => {
    expect(() => cosineSimilarity([1, 2, 3], [1, 2])).toThrow('Embedding size mismatch');
  });
});

// ─────────────────────────────────────────────────────────
// TEST 2: Dynamic Thresholding
// ─────────────────────────────────────────────────────────
describe('Dynamic Threshold', () => {
  it('should detect OPTIMAL lighting when brightness is normal', () => {
    const condition = detectEnvironmentCondition(120);
    expect(condition).toBe('OPTIMAL');
  });

  it('should detect LOW_LIGHT when brightness is below 40', () => {
    const condition = detectEnvironmentCondition(30);
    expect(condition).toBe('LOW_LIGHT');
  });

  it('should detect HARSH_LIGHT when brightness is above 210', () => {
    const condition = detectEnvironmentCondition(220);
    expect(condition).toBe('HARSH_LIGHT');
  });

  it('should raise threshold in low light conditions', () => {
    const result = getDynamicThreshold(30); // low light
    expect(result.threshold).toBeGreaterThan(0.75); // raised above baseline
    expect(result.condition).toBe('LOW_LIGHT');
  });

  it('should use baseline threshold 0.75 in optimal lighting', () => {
    const result = getDynamicThreshold(120); // optimal
    expect(result.threshold).toBe(0.75);
  });

  it('should further raise threshold if image quality is low', () => {
    const normalResult = getDynamicThreshold(120, 1.0);   // good quality
    const blurryResult = getDynamicThreshold(120, 0.3);   // blurry image
    expect(blurryResult.threshold).toBeGreaterThan(normalResult.threshold);
  });
});

// ─────────────────────────────────────────────────────────
// TEST 3: Face Embedding Generator (DEMO_MODE)
// ─────────────────────────────────────────────────────────
describe('FaceEmbeddingGenerator (DEMO_MODE)', () => {
  it('should generate an embedding with exactly 128 dimensions', async () => {
    const embedding = await faceEmbeddingGenerator.generateEmbedding('test_face.jpg');
    expect(embedding.length).toBe(128);
  });

  it('should return a normalized unit vector (L2 norm ≈ 1.0)', async () => {
    const embedding = await faceEmbeddingGenerator.generateEmbedding('test_face.jpg');
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    expect(norm).toBeCloseTo(1.0, 3);
  });

  it('should return different embeddings for different image paths', async () => {
    const emb1 = await faceEmbeddingGenerator.generateEmbedding('person_A.jpg');
    const emb2 = await faceEmbeddingGenerator.generateEmbedding('person_B.jpg');
    const score = cosineSimilarity(emb1, emb2);
    expect(score).toBeLessThan(1.0); // they should NOT be identical
  });
});

// ─────────────────────────────────────────────────────────
// TEST 4: Benchmark (Speed Test)
// ─────────────────────────────────────────────────────────
describe('AI Benchmark', () => {
  it(
    'should complete 20 embedding runs and pass the 1-second target',
    async () => {
      const result = await benchmarkEmbeddingSpeed(20);
      expect(result.totalRuns).toBe(20);
      expect(result.passedTarget).toBe(true); // avg time < 1000ms
      expect(result.passRate).toBeGreaterThan(90); // > 90% of runs under 1s
    },
    30000,
  );

  it(
    'should complete full matching pipeline benchmark',
    async () => {
      const result = await benchmarkMatchingPipeline(20);
      expect(result.averageTimeMs).toBeLessThan(1000);
    },
    30000,
  );
});
