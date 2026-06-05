import type {AuthLog} from '../../../types/LogTypes';
import {generateAuthLogHash} from '../../../utils/authLogHash';
import type {DatabaseRow} from '../databaseTypes';
import {getLocalDatabase} from '../localDatabase';

export type SyncStatusUpdateMetadata = {
  incrementAttempt?: boolean;
  lastSyncAttemptAt?: string | null;
  lastSyncError?: string | null;
  nextSyncAttemptAt?: string | null;
};

export class AuthLogRepository {
  async save(authLog: AuthLog): Promise<void> {
    const database = await getLocalDatabase();

    await database.execute(
      `INSERT INTO auth_logs (
        employee_id,
        auth_status,
        failure_reason,
        similarity_score,
        liveness_status,
        challenge_type,
        device_id,
        model_version,
        created_at,
        sync_status,
        log_hash,
        latitude,
        longitude,
        location_accuracy,
        altitude,
        ip_address,
        location_captured_at,
        sync_attempt_count,
        last_sync_attempt_at,
        last_sync_error,
        next_sync_attempt_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        authLog.employeeId,
        authLog.authStatus,
        authLog.failureReason ?? null,
        authLog.similarityScore ?? null,
        authLog.livenessStatus,
        authLog.challengeType,
        authLog.deviceId,
        authLog.modelVersion,
        authLog.createdAt,
        authLog.syncStatus,
        authLog.logHash ?? null,
        authLog.latitude ?? null,
        authLog.longitude ?? null,
        authLog.locationAccuracy ?? null,
        authLog.altitude ?? null,
        authLog.ipAddress ?? null,
        authLog.locationCapturedAt ?? null,
        authLog.syncAttemptCount ?? 0,
        authLog.lastSyncAttemptAt ?? null,
        authLog.lastSyncError ?? null,
        authLog.nextSyncAttemptAt ?? null,
      ],
    );
  }

  async getAll(): Promise<AuthLog[]> {
    const database = await getLocalDatabase();
    const result = await database.execute(
      `SELECT *
        FROM auth_logs
        ORDER BY created_at DESC`,
    );

    return result.rows.map(mapAuthLogRow);
  }

  async countPendingSync(): Promise<number> {
    const database = await getLocalDatabase();
    const result = await database.execute(
      `SELECT COUNT(*) AS pending_count
        FROM auth_logs
        WHERE sync_status = ?`,
      ['PENDING'],
    );

    const row = result.rows[0];
    const value = row?.pending_count ?? row?.['COUNT(*)'];
    return typeof value === 'number' ? value : Number(value) || 0;
  }

  async countFailedSync(): Promise<number> {
    const database = await getLocalDatabase();
    const result = await database.execute(
      `SELECT COUNT(*) AS failed_count
        FROM auth_logs
        WHERE sync_status = ?`,
      ['FAILED'],
    );

    const row = result.rows[0];
    const value = row?.failed_count ?? row?.['COUNT(*)'];
    return typeof value === 'number' ? value : Number(value) || 0;
  }

  async getPendingSync(): Promise<AuthLog[]> {
    const database = await getLocalDatabase();
    const result = await database.execute(
      `SELECT *
        FROM auth_logs
        WHERE sync_status = ?
        ORDER BY created_at ASC`,
      ['PENDING'],
    );

    return result.rows.map(mapAuthLogRow);
  }

  async getRetryablePendingSync(nowIso: string): Promise<AuthLog[]> {
    const database = await getLocalDatabase();
    const result = await database.execute(
      `SELECT *
        FROM auth_logs
        WHERE sync_status = ?
          AND (next_sync_attempt_at IS NULL OR next_sync_attempt_at <= ?)
        ORDER BY created_at ASC`,
      ['PENDING', nowIso],
    );

    return result.rows.map(mapAuthLogRow);
  }

  async getFailedSync(): Promise<AuthLog[]> {
    const database = await getLocalDatabase();
    const result = await database.execute(
      `SELECT *
        FROM auth_logs
        WHERE sync_status = ?
        ORDER BY created_at ASC`,
      ['FAILED'],
    );

    return result.rows.map(mapAuthLogRow);
  }

  async updateSyncStatus(
    id: number,
    syncStatus: AuthLog['syncStatus'],
    metadata: SyncStatusUpdateMetadata = {},
  ): Promise<void> {
    const database = await getLocalDatabase();
    const result = await database.execute(
      `SELECT *
        FROM auth_logs
        WHERE id = ?
        LIMIT 1`,
      [id],
    );
    const existing = result.rows[0] ? mapAuthLogRow(result.rows[0]) : null;

    if (!existing) {
      return;
    }

    const syncAttemptCount =
      (existing.syncAttemptCount ?? 0) + (metadata.incrementAttempt ? 1 : 0);
    const lastSyncAttemptAt = getNullableUpdateValue(
      metadata,
      'lastSyncAttemptAt',
      existing.lastSyncAttemptAt,
    );
    const lastSyncError = getNullableUpdateValue(
      metadata,
      'lastSyncError',
      existing.lastSyncError,
    );
    const nextSyncAttemptAt = getNullableUpdateValue(
      metadata,
      'nextSyncAttemptAt',
      existing.nextSyncAttemptAt,
    );

    const nextLog = {
      ...existing,
      syncStatus,
      syncAttemptCount,
      lastSyncAttemptAt: lastSyncAttemptAt ?? undefined,
      lastSyncError: lastSyncError ?? undefined,
      nextSyncAttemptAt: nextSyncAttemptAt ?? undefined,
    };
    const logHash = generateAuthLogHash(nextLog);

    await database.execute(
      `UPDATE auth_logs
        SET sync_status = ?,
          log_hash = ?,
          sync_attempt_count = ?,
          last_sync_attempt_at = ?,
          last_sync_error = ?,
          next_sync_attempt_at = ?
        WHERE id = ?`,
      [
        syncStatus,
        logHash,
        syncAttemptCount,
        lastSyncAttemptAt,
        lastSyncError,
        nextSyncAttemptAt,
        id,
      ],
    );
  }

  async resetFailedSyncLogs(): Promise<number> {
    const failedLogs = await this.getFailedSync();
    const failedWithIds = failedLogs.filter(hasLocalLogId);

    await Promise.all(
      failedWithIds.map(log =>
        this.updateSyncStatus(log.id, 'PENDING', {
          lastSyncError: null,
          nextSyncAttemptAt: null,
        }),
      ),
    );

    return failedWithIds.length;
  }
}

function mapAuthLogRow(row: DatabaseRow): AuthLog {
  return {
    id: toOptionalNumber(row.id),
    employeeId: String(row.employee_id),
    authStatus: row.auth_status as AuthLog['authStatus'],
    failureReason: toOptionalString(row.failure_reason),
    similarityScore: toOptionalNumber(row.similarity_score),
    livenessStatus: row.liveness_status as AuthLog['livenessStatus'],
    challengeType: row.challenge_type as AuthLog['challengeType'],
    deviceId: String(row.device_id),
    modelVersion: String(row.model_version),
    createdAt: String(row.created_at),
    syncStatus: row.sync_status as AuthLog['syncStatus'],
    logHash: toOptionalString(row.log_hash),
    latitude: toOptionalNumber(row.latitude),
    longitude: toOptionalNumber(row.longitude),
    locationAccuracy: toOptionalNumber(row.location_accuracy),
    altitude: toOptionalNumber(row.altitude),
    ipAddress: toOptionalString(row.ip_address),
    locationCapturedAt: toOptionalString(row.location_captured_at),
    syncAttemptCount: toOptionalNumber(row.sync_attempt_count) ?? 0,
    lastSyncAttemptAt: toOptionalString(row.last_sync_attempt_at),
    lastSyncError: toOptionalString(row.last_sync_error),
    nextSyncAttemptAt: toOptionalString(row.next_sync_attempt_at),
  };
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function getNullableUpdateValue<
  TKey extends 'lastSyncAttemptAt' | 'lastSyncError' | 'nextSyncAttemptAt',
>(
  metadata: SyncStatusUpdateMetadata,
  key: TKey,
  existingValue: string | undefined,
): string | null {
  if (Object.prototype.hasOwnProperty.call(metadata, key)) {
    return metadata[key] ?? null;
  }

  return existingValue ?? null;
}

function hasLocalLogId(authLog: AuthLog): authLog is AuthLog & {id: number} {
  return typeof authLog.id === 'number';
}

export const authLogRepository = new AuthLogRepository();
