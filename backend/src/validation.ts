import type {AuthLog, SyncAuthLogsRequest} from './authLogTypes';

const AUTH_STATUSES = new Set(['SUCCESS', 'FAILED']);
const LIVENESS_STATUSES = new Set(['PASSED', 'FAILED']);
const CHALLENGE_TYPES = new Set(['BLINK', 'SMILE', 'HEAD_TURN']);
const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/i;

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

  assertString(authLog.employeeId, 'employeeId', 128);
  assertString(authLog.deviceId, 'deviceId', 128);
  assertString(authLog.modelVersion, 'modelVersion', 128);
  assertString(authLog.createdAt, 'createdAt', 64);
  assertIsoTimestamp(authLog.createdAt, 'createdAt');

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
    (typeof authLog.similarityScore !== 'number' ||
      !Number.isFinite(authLog.similarityScore) ||
      authLog.similarityScore < 0 ||
      authLog.similarityScore > 1)
  ) {
    throw new Error('similarityScore must be a number between 0 and 1.');
  }

  if (
    authLog.id !== undefined &&
    (typeof authLog.id !== 'number' ||
      !Number.isInteger(authLog.id) ||
      authLog.id <= 0)
  ) {
    throw new Error('id must be a positive integer.');
  }

  assertOptionalString(authLog.failureReason, 'failureReason', false, 512);
  assertOptionalString(authLog.logHash, 'logHash', false, 128);
  assertOptionalHash(authLog.logHash, 'logHash');
  assertOptionalNumberInRange(authLog.latitude, 'latitude', -90, 90);
  assertOptionalNumberInRange(authLog.longitude, 'longitude', -180, 180);
  assertOptionalNumberInRange(
    authLog.locationAccuracy,
    'locationAccuracy',
    0,
    Number.MAX_SAFE_INTEGER,
  );
  assertOptionalNumber(authLog.altitude, 'altitude');
  assertOptionalString(authLog.ipAddress, 'ipAddress', false, 64);
  assertOptionalString(
    authLog.locationCapturedAt,
    'locationCapturedAt',
    false,
    64,
  );
  assertOptionalIsoTimestamp(
    authLog.locationCapturedAt,
    'locationCapturedAt',
  );

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
    latitude: authLog.latitude,
    longitude: authLog.longitude,
    locationAccuracy: authLog.locationAccuracy,
    altitude: authLog.altitude,
    ipAddress: authLog.ipAddress,
    locationCapturedAt: authLog.locationCapturedAt,
  };
}

function assertString(
  value: unknown,
  fieldName: string,
  maxLength: number,
): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${fieldName} is required.`);
  }

  if (value.length > maxLength) {
    throw new Error(`${fieldName} is too long.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function assertOptionalNumber(value: unknown, fieldName: string): void {
  if (
    value !== undefined &&
    (typeof value !== 'number' || !Number.isFinite(value))
  ) {
    throw new Error(`${fieldName} must be a number.`);
  }
}

function assertOptionalNumberInRange(
  value: unknown,
  fieldName: string,
  min: number,
  max: number,
): void {
  assertOptionalNumber(value, fieldName);

  if (
    typeof value === 'number' &&
    (value < min || value > max)
  ) {
    throw new Error(`${fieldName} is out of range.`);
  }
}

function assertOptionalString(
  value: unknown,
  fieldName: string,
  required: boolean,
  maxLength: number,
): void {
  if (value === undefined) {
    return;
  }

  if (typeof value !== 'string' || (required && value.length === 0)) {
    throw new Error(`${fieldName} must be a string.`);
  }

  if (value.length > maxLength) {
    throw new Error(`${fieldName} is too long.`);
  }
}

function assertOptionalHash(value: unknown, fieldName: string): void {
  if (value === undefined) {
    return;
  }

  if (typeof value !== 'string' || !SHA256_HEX_PATTERN.test(value)) {
    throw new Error(`${fieldName} must be a SHA-256 hex digest.`);
  }
}

function assertIsoTimestamp(value: string, fieldName: string): void {
  const parsed = Date.parse(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a valid ISO timestamp.`);
  }
}

function assertOptionalIsoTimestamp(
  value: unknown,
  fieldName: string,
): void {
  if (value === undefined) {
    return;
  }

  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string.`);
  }

  assertIsoTimestamp(value, fieldName);
}
