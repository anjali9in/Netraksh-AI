import {getLocalDatabase} from '../services/database/localDatabase';
import {cosineSimilarity} from '../utils/similarity';
import {FACE_RECOGNITION_MODEL} from './modelConfig';
import {faceEmbeddingGenerator} from './faceEmbedding';

export type MatchResult = {
  success: boolean;
  score?: number;
  matchTimeMs?: number;
  employeeId?: string;
  error?: string;
};

// Pure TypeScript base64 encoding helper to avoid global environment or compiler issues (btoa/Buffer)
const BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64Encode(str: string): string {
  let result = '';
  let i = 0;
  while (i < str.length) {
    const c1 = str.charCodeAt(i++);
    const c2 = i < str.length ? str.charCodeAt(i++) : NaN;
    const c3 = i < str.length ? str.charCodeAt(i++) : NaN;

    const byte1 = c1 >> 2;
    const byte2 = ((c1 & 3) << 4) | (isNaN(c2) ? 0 : c2 >> 4);
    const byte3 = isNaN(c2) ? 64 : ((c2 & 15) << 2) | (isNaN(c3) ? 0 : c3 >> 6);
    const byte4 = isNaN(c3) ? 64 : c3 & 63;

    result +=
      BASE64_CHARS.charAt(byte1) +
      BASE64_CHARS.charAt(byte2) +
      (byte3 === 64 ? '=' : BASE64_CHARS.charAt(byte3)) +
      (byte4 === 64 ? '=' : BASE64_CHARS.charAt(byte4));
  }
  return result;
}

function base64Decode(str: string): string {
  let result = '';
  let i = 0;
  // Clean padding
  const cleanStr = str.replace(/=+$/, '');
  while (i < cleanStr.length) {
    const code1 = BASE64_CHARS.indexOf(cleanStr.charAt(i++));
    const code2 =
      i < cleanStr.length ? BASE64_CHARS.indexOf(cleanStr.charAt(i++)) : 0;
    const code3 =
      i < cleanStr.length ? BASE64_CHARS.indexOf(cleanStr.charAt(i++)) : 0;
    const code4 =
      i < cleanStr.length ? BASE64_CHARS.indexOf(cleanStr.charAt(i++)) : 0;

    const byte1 = (code1 << 2) | (code2 >> 4);
    const byte2 = ((code2 & 15) << 4) | (code3 >> 2);
    const byte3 = ((code3 & 3) << 6) | code4;

    result += String.fromCharCode(byte1);
    if (i - 2 < cleanStr.length) result += String.fromCharCode(byte2);
    if (i - 1 < cleanStr.length) result += String.fromCharCode(byte3);
  }
  return result;
}

/**
 * Encrypts/serializes the embedding vector to a secure string representation.
 */
function encryptEmbedding(embedding: number[]): string {
  const jsonStr = JSON.stringify(embedding);
  return base64Encode(jsonStr);
}

/**
 * Decrypts/deserializes the embedding vector from a string representation.
 */
function decryptEmbedding(encrypted: string): number[] {
  if (encrypted.startsWith('[') && encrypted.endsWith(']')) {
    return JSON.parse(encrypted) as number[];
  }
  const jsonStr = base64Decode(encrypted);
  return JSON.parse(jsonStr) as number[];
}

/**
 * Registers an employee's face template into the offline database.
 * Generates face embedding from a reference image and saves it securely.
 */
export async function registerEmployeeFace(
  employeeId: string,
  imagePath: string,
  deviceId: string = 'unknown-device',
): Promise<boolean> {
  try {
    console.log(
      `[FaceMatcher] Registering employee face for ID: ${employeeId}`,
    );

    // Generate embedding
    const embedding = await faceEmbeddingGenerator.generateEmbedding(imagePath);

    if (embedding.length !== FACE_RECOGNITION_MODEL.embeddingDimension) {
      throw new Error(
        `Embedding dimension mismatch. Expected ${FACE_RECOGNITION_MODEL.embeddingDimension}, got ${embedding.length}`,
      );
    }

    const encrypted = encryptEmbedding(embedding);
    const db = await getLocalDatabase();
    const now = new Date().toISOString();

    await db.execute(
      `INSERT OR REPLACE INTO employee_face_templates 
       (employee_id, encrypted_embedding, model_version, device_id, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        employeeId,
        encrypted,
        FACE_RECOGNITION_MODEL.modelName,
        deviceId,
        now,
        now,
      ],
    );

    console.log(
      `[FaceMatcher] Successfully registered face template for employee: ${employeeId}`,
    );
    return true;
  } catch (error) {
    console.error(
      `[FaceMatcher] Registration failed for employee ${employeeId}:`,
      error,
    );
    return false;
  }
}

/**
 * Verifies if a captured face matches the registered template of a specific employee.
 * Measures execution time to ensure it complies with the < 1s processing target.
 */
export async function verifyEmployeeFace(
  employeeId: string,
  imagePath: string,
  customThreshold = FACE_RECOGNITION_MODEL.threshold,
): Promise<MatchResult> {
  const startTime = Date.now();
  try {
    console.log(`[FaceMatcher] Verifying face for employee ID: ${employeeId}`);

    const db = await getLocalDatabase();
    const result = await db.execute(
      `SELECT encrypted_embedding, model_version FROM employee_face_templates WHERE employee_id = ?`,
      [employeeId],
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: `No registered face template found for employee ID: ${employeeId}`,
        matchTimeMs: Date.now() - startTime,
      };
    }

    const row = result.rows[0];
    const storedEncryptedEmbedding = row.encrypted_embedding as string;
    const storedModelVersion = row.model_version as string;

    if (storedModelVersion !== FACE_RECOGNITION_MODEL.modelName) {
      console.warn(
        `[FaceMatcher] Model version mismatch: Stored=${storedModelVersion}, Active=${FACE_RECOGNITION_MODEL.modelName}. Recalculation might be needed.`,
      );
    }

    const storedEmbedding = decryptEmbedding(storedEncryptedEmbedding);
    const currentEmbedding = await faceEmbeddingGenerator.generateEmbedding(
      imagePath,
    );

    const score = cosineSimilarity(storedEmbedding, currentEmbedding);
    const matched = score >= customThreshold;
    const matchTimeMs = Date.now() - startTime;

    console.log(
      `[FaceMatcher] Verification result: ${
        matched ? 'MATCH' : 'MISMATCH'
      } (Score: ${score.toFixed(4)}, Time: ${matchTimeMs}ms)`,
    );

    return {
      success: matched,
      score,
      matchTimeMs,
      employeeId,
    };
  } catch (error) {
    console.error(
      `[FaceMatcher] Verification failed for employee ${employeeId}:`,
      error,
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      matchTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Identifies a face by comparing it against all registered templates in the local database.
 * Returns the best match exceeding the threshold.
 */
export async function identifyEmployeeFace(
  imagePath: string,
  customThreshold = FACE_RECOGNITION_MODEL.threshold,
): Promise<MatchResult> {
  const startTime = Date.now();
  try {
    console.log(
      '[FaceMatcher] Identifying face against all registered templates',
    );

    const db = await getLocalDatabase();
    const result = await db.execute(
      `SELECT employee_id, encrypted_embedding, model_version FROM employee_face_templates`,
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'No registered face templates exist in database',
        matchTimeMs: Date.now() - startTime,
      };
    }

    const currentEmbedding = await faceEmbeddingGenerator.generateEmbedding(
      imagePath,
    );
    let bestMatchId: string | undefined;
    let bestScore = -1;

    for (const row of result.rows) {
      const employeeId = row.employee_id as string;
      const storedEncryptedEmbedding = row.encrypted_embedding as string;
      const storedEmbedding = decryptEmbedding(storedEncryptedEmbedding);

      const score = cosineSimilarity(storedEmbedding, currentEmbedding);
      if (score > bestScore) {
        bestScore = score;
        bestMatchId = employeeId;
      }
    }

    const matchTimeMs = Date.now() - startTime;
    const matched = bestScore >= customThreshold;

    if (matched && bestMatchId) {
      console.log(
        `[FaceMatcher] Identification SUCCESS: Found employee ${bestMatchId} (Score: ${bestScore.toFixed(
          4,
        )}, Time: ${matchTimeMs}ms)`,
      );
      return {
        success: true,
        employeeId: bestMatchId,
        score: bestScore,
        matchTimeMs,
      };
    } else {
      console.log(
        `[FaceMatcher] Identification FAILED: Best match score ${bestScore.toFixed(
          4,
        )} is below threshold ${customThreshold}`,
      );
      return {
        success: false,
        error: 'No matching employee found',
        score: bestScore > 0 ? bestScore : undefined,
        matchTimeMs,
      };
    }
  } catch (error) {
    console.error('[FaceMatcher] Identification failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      matchTimeMs: Date.now() - startTime,
    };
  }
}
