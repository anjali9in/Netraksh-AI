export type AuthResult = {
  success: boolean;
  reason?: string;
  similarityScore?: number;
  livenessPassed?: boolean;
  processingTimeMs?: number;
};
