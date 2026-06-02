import { faceEmbeddingGenerator } from './faceEmbedding';
import { cosineSimilarity } from '../utils/similarity';
import { FACE_RECOGNITION_MODEL } from './modelConfig';

export type BenchmarkResult = {
  totalRuns: number;
  totalTimeMs: number;
  averageTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  passedTarget: boolean; // whether average is under MAX_AUTH_TIME_MS (1000ms)
  passRate: number;      // % of runs that completed under 1 second
};

const MAX_AUTH_TIME_MS = 1000; // Hackathon target: < 1 second

/**
 * Runs a benchmark stress test for the embedding generation speed.
 * Simulates generating embeddings for N unique face image paths and measures performance.
 *
 * @param runs Number of embedding generation runs (default: 50)
 */
export async function benchmarkEmbeddingSpeed(runs: number = 50): Promise<BenchmarkResult> {
  console.log(`[Benchmark] Starting embedding speed benchmark: ${runs} runs...`);

  const times: number[] = [];

  for (let i = 0; i < runs; i++) {
    const fakePath = `benchmark_face_${i}.jpg`; // Uses DEMO_MODE mock paths
    const start = Date.now();
    await faceEmbeddingGenerator.generateEmbedding(fakePath);
    const elapsed = Date.now() - start;
    times.push(elapsed);
  }

  return computeStats(times, runs);
}

/**
 * Runs a benchmark stress test for the full face matching pipeline:
 * Embedding generation + Cosine similarity comparison.
 *
 * @param runs Number of full match pipeline runs (default: 50)
 */
export async function benchmarkMatchingPipeline(runs: number = 50): Promise<BenchmarkResult> {
  console.log(`[Benchmark] Starting full matching pipeline benchmark: ${runs} runs...`);

  // Pre-generate a reference stored embedding to compare against
  const storedEmbedding = await faceEmbeddingGenerator.generateEmbedding('stored_reference.jpg');

  const times: number[] = [];

  for (let i = 0; i < runs; i++) {
    const fakePath = `live_capture_${i}.jpg`;
    const start = Date.now();

    const currentEmbedding = await faceEmbeddingGenerator.generateEmbedding(fakePath);
    cosineSimilarity(storedEmbedding, currentEmbedding);

    const elapsed = Date.now() - start;
    times.push(elapsed);
  }

  return computeStats(times, runs);
}

/**
 * Computes statistical results from a list of timing samples.
 */
function computeStats(times: number[], runs: number): BenchmarkResult {
  const totalTimeMs = times.reduce((sum, t) => sum + t, 0);
  const averageTimeMs = totalTimeMs / runs;
  const minTimeMs = Math.min(...times);
  const maxTimeMs = Math.max(...times);
  const passedRuns = times.filter(t => t < MAX_AUTH_TIME_MS).length;
  const passRate = (passedRuns / runs) * 100;
  const passedTarget = averageTimeMs < MAX_AUTH_TIME_MS;

  const result: BenchmarkResult = {
    totalRuns: runs,
    totalTimeMs,
    averageTimeMs,
    minTimeMs,
    maxTimeMs,
    passedTarget,
    passRate,
  };

  // Print a clean, readable report to the console
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║       NETRAKSH-AI BENCHMARK REPORT       ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Model      : ${FACE_RECOGNITION_MODEL.modelName.padEnd(27)}║`);
  console.log(`║  Total Runs : ${String(runs).padEnd(27)}║`);
  console.log(`║  Avg Time   : ${(averageTimeMs.toFixed(2) + ' ms').padEnd(27)}║`);
  console.log(`║  Min Time   : ${(minTimeMs + ' ms').padEnd(27)}║`);
  console.log(`║  Max Time   : ${(maxTimeMs + ' ms').padEnd(27)}║`);
  console.log(`║  Pass Rate  : ${(passRate.toFixed(1) + '%  (<1s target)').padEnd(27)}║`);
  console.log(`║  Status     : ${(passedTarget ? '✅ PASSES TARGET' : '❌ FAILS TARGET').padEnd(27)}║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  return result;
}
