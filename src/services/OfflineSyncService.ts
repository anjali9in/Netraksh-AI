import {authLogRepository} from './database/repositories/authLogRepository';
import {syncApi} from './api/syncApi';
import type {AuthLog} from '../types/LogTypes';

export type OfflineSyncResult = {
  attemptedCount: number;
  syncedCount: number;
  failedCount: number;
};

export class OfflineSyncService {
  async syncPendingLogs(): Promise<OfflineSyncResult> {
    const pendingLogs = await authLogRepository.getPendingSync();

    if (pendingLogs.length === 0) {
      return {
        attemptedCount: 0,
        syncedCount: 0,
        failedCount: 0,
      };
    }

    const response = await syncApi.syncOfflineAuthLogs(pendingLogs);

    if (!response.success) {
      throw new Error(response.message || 'Unable to sync pending logs.');
    }

    const failedLogIds = new Set(response.data.failedLogIds ?? []);

    await Promise.all(
      pendingLogs
        .filter(hasLocalLogId)
        .map(log =>
          authLogRepository.updateSyncStatus(
            log.id,
            failedLogIds.has(log.id) ? 'FAILED' : 'SYNCED',
          ),
        ),
    );

    return {
      attemptedCount: pendingLogs.length,
      syncedCount: response.data.syncedCount,
      failedCount: failedLogIds.size,
    };
  }
}

export const offlineSyncService = new OfflineSyncService();

function hasLocalLogId(authLog: AuthLog): authLog is AuthLog & {id: number} {
  return typeof authLog.id === 'number';
}
