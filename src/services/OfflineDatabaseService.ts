import type {AuthLog} from '../types/LogTypes';
import {authLogRepository} from './database/repositories/authLogRepository';
import {getLocalDatabase} from './database/localDatabase';

export class OfflineDatabaseService {
  async initDatabase(): Promise<void> {
    await getLocalDatabase();
  }

  async saveAuthLog(authLog: AuthLog): Promise<void> {
    await authLogRepository.save(authLog);
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
}

export const offlineDatabaseService = new OfflineDatabaseService();
