export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embedding size mismatch");
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function isFaceMatched(
  storedEmbedding: number[],
  currentEmbedding: number[],
  threshold = 0.75
): boolean {
  const score = cosineSimilarity(storedEmbedding, currentEmbedding);
  return score >= threshold;
}
