import type {AuthLog, SyncAuthLogsRequest} from './authLogTypes';

const AUTH_STATUSES = new Set(['SUCCESS', 'FAILED']);
const LIVENESS_STATUSES = new Set(['PASSED', 'FAILED']);
const CHALLENGE_TYPES = new Set(['BLINK', 'SMILE', 'HEAD_TURN']);

export function parseSyncAuthLogsRequest(
  body: string | null,
): SyncAuthLogsRequest {
  if (!body) {
    throw new Error('Request body is required.');
  }

  const parsed = JSON.parse(body) as Partial<SyncAuthLogsRequest>;

  if (!Array.isArray(parsed.logs)) {
    throw new Error('logs must be an array.');
  }

  return {
    logs: parsed.logs.map(validateAuthLog),
  };
}

function validateAuthLog(value: unknown): AuthLog {
  if (!isRecord(value)) {
    throw new Error('Each log must be an object.');
  }

  const authLog = value as Partial<AuthLog>;

  assertString(authLog.employeeId, 'employeeId');
  assertString(authLog.deviceId, 'deviceId');
  assertString(authLog.modelVersion, 'modelVersion');
  assertString(authLog.createdAt, 'createdAt');

  if (!AUTH_STATUSES.has(String(authLog.authStatus))) {
    throw new Error('authStatus is invalid.');
  }

  if (!LIVENESS_STATUSES.has(String(authLog.livenessStatus))) {
    throw new Error('livenessStatus is invalid.');
  }

  if (!CHALLENGE_TYPES.has(String(authLog.challengeType))) {
    throw new Error('challengeType is invalid.');
  }

  if (
    authLog.similarityScore !== undefined &&
    typeof authLog.similarityScore !== 'number'
  ) {
    throw new Error('similarityScore must be a number.');
  }

  if (authLog.id !== undefined && typeof authLog.id !== 'number') {
    throw new Error('id must be a number.');
  }

  return {
    id: authLog.id,
    employeeId: authLog.employeeId,
    authStatus: authLog.authStatus as AuthLog['authStatus'],
    failureReason: authLog.failureReason,
    similarityScore: authLog.similarityScore,
    livenessStatus: authLog.livenessStatus as AuthLog['livenessStatus'],
    challengeType: authLog.challengeType as AuthLog['challengeType'],
    deviceId: authLog.deviceId,
    modelVersion: authLog.modelVersion,
    createdAt: authLog.createdAt,
    syncStatus: 'PENDING',
    logHash: authLog.logHash,
  };
}

function assertString(
  value: unknown,
  fieldName: string,
): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${fieldName} is required.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
