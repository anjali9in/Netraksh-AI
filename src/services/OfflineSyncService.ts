import {authLogRepository} from './database/repositories/authLogRepository';
import {syncApi} from './api/syncApi';
import type {AuthLog} from '../types/LogTypes';
import {normalizeApiError, type NormalizedApiError} from './api/apiError';

export type OfflineSyncResult = {
  attemptedCount: number;
  syncedCount: number;
  failedCount: number;
  retryScheduledCount: number;
  skippedCount: number;
  nextRetryAt?: string;
};

export type OfflineSyncOptions = {
  force?: boolean;
};

const BASE_RETRY_DELAY_MS = 60 * 1000;
const MAX_RETRY_DELAY_MS = 60 * 60 * 1000;
const MAX_SYNC_ERROR_LENGTH = 240;

export class OfflineSyncService {
  async syncPendingLogs(
    options: OfflineSyncOptions = {},
  ): Promise<OfflineSyncResult> {
    const attemptStartedAt = new Date().toISOString();
    const pendingLogs = options.force
      ? await authLogRepository.getPendingSync()
      : await authLogRepository.getRetryablePendingSync(attemptStartedAt);
    const allPendingCount = await authLogRepository.countPendingSync();

    if (pendingLogs.length === 0) {
      return {
        attemptedCount: 0,
        syncedCount: 0,
        failedCount: 0,
        retryScheduledCount: 0,
        skippedCount: allPendingCount,
      };
    }

    const response = await syncApi.syncOfflineAuthLogs(pendingLogs).catch(
      async error => {
        const apiError = normalizeApiError(error);

        if (isPermanentSyncError(apiError)) {
          await markLogsAfterBatchRejection(
            pendingLogs,
            attemptStartedAt,
            apiError.message,
          );
          throw apiError;
        }

        const nextRetryAt = await markLogsForRetry(
          pendingLogs,
          attemptStartedAt,
          apiError.message,
        );

        throw {
          ...apiError,
          nextRetryAt,
        };
      },
    );

    if (!response.success) {
      const message = response.message || 'Unable to sync pending logs.';
      await markLogsAfterBatchRejection(pendingLogs, attemptStartedAt, message);
      throw new Error(message);
    }

    const failedLogIds = new Set(response.data.failedLogIds ?? []);

    await Promise.all(
      pendingLogs
        .filter(hasLocalLogId)
        .map(log =>
          authLogRepository.updateSyncStatus(
            log.id,
            failedLogIds.has(log.id) ? 'FAILED' : 'SYNCED',
            {
              incrementAttempt: true,
              lastSyncAttemptAt: attemptStartedAt,
              lastSyncError: failedLogIds.has(log.id)
                ? 'Backend rejected this log during sync.'
                : null,
              nextSyncAttemptAt: null,
            },
          ),
        ),
    );

    return {
      attemptedCount: pendingLogs.length,
      syncedCount: response.data.syncedCount,
      failedCount: failedLogIds.size,
      retryScheduledCount: 0,
      skippedCount: Math.max(0, allPendingCount - pendingLogs.length),
    };
  }
}

export const offlineSyncService = new OfflineSyncService();

function hasLocalLogId(authLog: AuthLog): authLog is AuthLog & {id: number} {
  return typeof authLog.id === 'number';
}

async function markLogsAfterBatchRejection(
  logs: AuthLog[],
  attemptStartedAt: string,
  message: string,
): Promise<void> {
  await Promise.all(
    logs.filter(hasLocalLogId).map(log =>
      authLogRepository.updateSyncStatus(log.id, 'FAILED', {
        incrementAttempt: true,
        lastSyncAttemptAt: attemptStartedAt,
        lastSyncError: truncateSyncError(message),
        nextSyncAttemptAt: null,
      }),
    ),
  );
}

async function markLogsForRetry(
  logs: AuthLog[],
  attemptStartedAt: string,
  message: string,
): Promise<string | undefined> {
  let earliestRetryAt: string | undefined;

  await Promise.all(
    logs.filter(hasLocalLogId).map(async log => {
      const nextRetryAt = getNextRetryAt(log, attemptStartedAt);

      if (!earliestRetryAt || nextRetryAt < earliestRetryAt) {
        earliestRetryAt = nextRetryAt;
      }

      await authLogRepository.updateSyncStatus(log.id, 'PENDING', {
        incrementAttempt: true,
        lastSyncAttemptAt: attemptStartedAt,
        lastSyncError: truncateSyncError(message),
        nextSyncAttemptAt: nextRetryAt,
      });
    }),
  );

  return earliestRetryAt;
}

function getNextRetryAt(log: AuthLog, attemptStartedAt: string): string {
  const priorAttempts = log.syncAttemptCount ?? 0;
  const boundedExponent = Math.min(priorAttempts, 6);
  const delayMs = Math.min(
    BASE_RETRY_DELAY_MS * 2 ** boundedExponent,
    MAX_RETRY_DELAY_MS,
  );

  return new Date(new Date(attemptStartedAt).getTime() + delayMs).toISOString();
}

function truncateSyncError(message: string): string {
  return message.length <= MAX_SYNC_ERROR_LENGTH
    ? message
    : `${message.slice(0, MAX_SYNC_ERROR_LENGTH - 3)}...`;
}

function isPermanentSyncError(error: NormalizedApiError): boolean {
  return error.status === 400 || error.status === 422;
}
