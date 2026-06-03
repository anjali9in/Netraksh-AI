import {getLocalDatabase} from './database/localDatabase';
import {sha256} from '../utils/hash';
import type {DatabaseRow} from './database/databaseTypes';
import type {AuthLog} from '../types/LogTypes';
import type {User} from '../types/UserTypes';
import {authLogRepository} from './database/repositories/authLogRepository';
import {userRepository} from './database/repositories/userRepository';

export type AuthLogEntry = {
  id?: number;
  employeeId: string;
  authStatus: 'SUCCESS' | 'FAILED';
  failureReason: string | null;
  similarityScore: number | null;
  livenessStatus: 'PASSED' | 'FAILED';
  challengeType: 'BLINK' | 'SMILE' | 'HEAD_TURN';
  deviceId: string;
  modelVersion: string;
  createdAt: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  logHash: string | null;
};

export class OfflineDatabaseService {
  private isInitialized: boolean = false;

  /**
   * Initializes the database connection and runs migrations.
   */
  public async initDatabase(): Promise<boolean> {
    try {
      console.log('[OfflineDatabaseService] Initializing SQLite Database...');
      const db = await getLocalDatabase();
      this.isInitialized = !!db;
      console.log('[OfflineDatabaseService] SQLite Database Initialized.');
      return this.isInitialized;
    } catch (error) {
      console.error(
        '[OfflineDatabaseService] Failed to initialize local database:',
        error,
      );
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Creates a tamper-proof integrity hash for an authentication log.
   */
  public generateLogHash(log: Omit<AuthLogEntry, 'id' | 'logHash'>): string {
    const payload = [
      log.employeeId,
      log.authStatus,
      log.failureReason ?? '',
      log.similarityScore !== null ? log.similarityScore.toFixed(4) : '',
      log.livenessStatus,
      log.challengeType,
      log.deviceId,
      log.modelVersion,
      log.createdAt,
      log.syncStatus,
    ].join('|');

    return sha256(payload);
  }

  /**
   * Verifies if a log entry's hash matches its current values.
   */
  public verifyLogIntegrity(log: AuthLogEntry): boolean {
    if (!log.logHash) return false;
    const rest = {...log};
    delete (rest as any).id;
    delete (rest as any).logHash;
    const expectedHash = this.generateLogHash(rest);
    return expectedHash === log.logHash;
  }

  /**
   * Logs a new facial authentication attempt locally.
   */
  public async logAuthAttempt(
    params: Omit<AuthLogEntry, 'id' | 'createdAt' | 'syncStatus' | 'logHash'>,
  ): Promise<number | undefined> {
    try {
      const db = await getLocalDatabase();
      const createdAt = new Date().toISOString();
      const syncStatus = 'PENDING' as const;

      const logData = {
        ...params,
        createdAt,
        syncStatus,
      };

      const logHash = this.generateLogHash(logData);

      console.log(
        `[OfflineDatabaseService] Logging attempt for ${params.employeeId}. Status: ${params.authStatus}`,
      );

      const result = await db.execute(
        `INSERT INTO auth_logs 
        (employee_id, auth_status, failure_reason, similarity_score, liveness_status, challenge_type, device_id, model_version, created_at, sync_status, log_hash) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          logData.employeeId,
          logData.authStatus,
          logData.failureReason,
          logData.similarityScore,
          logData.livenessStatus,
          logData.challengeType,
          logData.deviceId,
          logData.modelVersion,
          logData.createdAt,
          logData.syncStatus,
          logHash,
        ],
      );

      return result.insertId;
    } catch (error) {
      console.error(
        '[OfflineDatabaseService] Failed to log auth attempt:',
        error,
      );
      throw error;
    }
  }

  /**
   * Fetches all logs waiting to be synchronized with the remote server.
   */
  public async getPendingLogs(): Promise<AuthLogEntry[]> {
    try {
      const db = await getLocalDatabase();
      const result = await db.execute(
        `SELECT * FROM auth_logs WHERE sync_status = 'PENDING' ORDER BY created_at ASC`,
      );

      return result.rows.map(mapRowToLogEntry);
    } catch (error) {
      console.error(
        '[OfflineDatabaseService] Failed to fetch pending logs:',
        error,
      );
      return [];
    }
  }

  /**
   * Marks a set of logs as synced after successful network uploads.
   */
  public async markLogsAsSynced(logIds: number[]): Promise<boolean> {
    if (logIds.length === 0) return true;
    try {
      const db = await getLocalDatabase();

      await db.transaction(async tx => {
        for (const id of logIds) {
          // Fetch log first to recalculate its hash with the new sync status
          const fetchResult = await tx.execute(
            `SELECT * FROM auth_logs WHERE id = ?`,
            [id],
          );
          if (fetchResult.rows.length > 0) {
            const log = mapRowToLogEntry(fetchResult.rows[0]);
            log.syncStatus = 'SYNCED';
            const rest = {...log};
            delete (rest as any).id;
            delete (rest as any).logHash;
            const newHash = this.generateLogHash(rest);

            await tx.execute(
              `UPDATE auth_logs SET sync_status = 'SYNCED', log_hash = ? WHERE id = ?`,
              [newHash, id],
            );
          }
        }
      });

      console.log(
        `[OfflineDatabaseService] Marked ${logIds.length} logs as SYNCED.`,
      );
      return true;
    } catch (error) {
      console.error(
        '[OfflineDatabaseService] Failed to update sync status:',
        error,
      );
      return false;
    }
  }

  /**
   * Fetches all local logs. Used for presenting history to developers/inspectors.
   */
  public async getAllLogs(): Promise<AuthLogEntry[]> {
    try {
      const db = await getLocalDatabase();
      const result = await db.execute(
        `SELECT * FROM auth_logs ORDER BY created_at DESC`,
      );

      return result.rows.map(mapRowToLogEntry);
    } catch (error) {
      console.error(
        '[OfflineDatabaseService] Failed to fetch all logs:',
        error,
      );
      return [];
    }
  }

  /**
   * Purges old synchronized logs to save device disk space.
   */
  public async clearSyncedLogs(olderThanDays: number = 30): Promise<number> {
    try {
      const db = await getLocalDatabase();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      const cutoffIso = cutoffDate.toISOString();

      const result = await db.execute(
        `DELETE FROM auth_logs WHERE sync_status = 'SYNCED' AND created_at < ?`,
        [cutoffIso],
      );

      console.log(
        `[OfflineDatabaseService] Purged ${result.rowsAffected} synced logs older than ${olderThanDays} days.`,
      );
      return result.rowsAffected;
    } catch (error) {
      console.error(
        '[OfflineDatabaseService] Failed to purge old synced logs:',
        error,
      );
      return 0;
    }
  }

  // --- Repository wrapper methods from origin/master ---

  async saveAuthLog(authLog: AuthLog): Promise<void> {
    await authLogRepository.save(authLog);
  }

  async saveUser(user: User): Promise<void> {
    await userRepository.save(user);
  }

  async getUsers(): Promise<User[]> {
    return userRepository.getAll();
  }

  async getUserByEmployeeId(employeeId: string): Promise<User | null> {
    return userRepository.findByEmployeeId(employeeId);
  }

  async getPendingSyncUsers(): Promise<User[]> {
    return userRepository.getPendingSync();
  }

  async getOfflineLogs(): Promise<AuthLog[]> {
    return authLogRepository.getAll();
  }

  async getPendingSyncLogs(): Promise<AuthLog[]> {
    return authLogRepository.getPendingSync();
  }

  async markLogSyncStatus(
    id: number,
    syncStatus: AuthLog['syncStatus'],
  ): Promise<void> {
    await authLogRepository.updateSyncStatus(id, syncStatus);
  }

  async markUserSyncStatus(
    employeeId: string,
    syncStatus: User['syncStatus'],
  ): Promise<void> {
    await userRepository.updateSyncStatus(employeeId, syncStatus);
  }
}

/**
 * Maps a generic database row to a typed AuthLogEntry object.
 */
function mapRowToLogEntry(row: DatabaseRow): AuthLogEntry {
  return {
    id: row.id as number,
    employeeId: row.employee_id as string,
    authStatus: row.auth_status as 'SUCCESS' | 'FAILED',
    failureReason: row.failure_reason as string | null,
    similarityScore: row.similarity_score as number | null,
    livenessStatus: row.liveness_status as 'PASSED' | 'FAILED',
    challengeType: row.challenge_type as 'BLINK' | 'SMILE' | 'HEAD_TURN',
    deviceId: row.device_id as string,
    modelVersion: row.model_version as string,
    createdAt: row.created_at as string,
    syncStatus: row.sync_status as 'PENDING' | 'SYNCED' | 'FAILED',
    logHash: row.log_hash as string | null,
  };
}

export const offlineDatabaseService = new OfflineDatabaseService();
