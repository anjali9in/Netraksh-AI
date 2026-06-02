import type {AuthLog} from '../types/LogTypes';
import type {User} from '../types/UserTypes';
import {authLogRepository} from './database/repositories/authLogRepository';
import {userRepository} from './database/repositories/userRepository';
import {getLocalDatabase} from './database/localDatabase';

export class OfflineDatabaseService {
  async initDatabase(): Promise<void> {
    await getLocalDatabase();
  }

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

export const offlineDatabaseService = new OfflineDatabaseService();
