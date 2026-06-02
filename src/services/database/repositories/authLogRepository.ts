import type {AuthLog} from '../../../types/LogTypes';
import type {DatabaseRow} from '../databaseTypes';
import {getLocalDatabase} from '../localDatabase';

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
        log_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

  async updateSyncStatus(
    id: number,
    syncStatus: AuthLog['syncStatus'],
  ): Promise<void> {
    const database = await getLocalDatabase();

    await database.execute(
      `UPDATE auth_logs
        SET sync_status = ?
        WHERE id = ?`,
      [syncStatus, id],
    );
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
  };
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

export const authLogRepository = new AuthLogRepository();
