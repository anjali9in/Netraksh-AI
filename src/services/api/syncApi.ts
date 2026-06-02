import type {ApiResponse} from './apiTypes';
import type {AuthLog} from '../../types/LogTypes';
import axiosClient from './axiosClient';

export type SyncOfflineAuthLogsResponse = ApiResponse<{
  syncedCount: number;
  failedLogIds?: number[];
}>;

export async function syncOfflineAuthLogs(
  logs: AuthLog[],
): Promise<SyncOfflineAuthLogsResponse> {
  return axiosClient.post<
    unknown,
    SyncOfflineAuthLogsResponse,
    {logs: AuthLog[]}
  >('/sync/auth-logs', {logs});
}

export const syncApi = {
  syncOfflineAuthLogs,
};
