import {offlineDatabaseService} from '../src/services/OfflineDatabaseService';
import {offlineSyncService} from '../src/services/OfflineSyncService';
import {syncApi} from '../src/services/api/syncApi';

jest.mock('../src/services/api/syncApi', () => ({
  syncApi: {
    syncOfflineAuthLogs: jest.fn(),
  },
}));

const mockSyncOfflineAuthLogs = syncApi.syncOfflineAuthLogs as jest.Mock;

describe('OfflineSyncService', () => {
  beforeEach(() => {
    (global as any).resetMockDatabase();
    jest.clearAllMocks();
  });

  it('keeps retryable sync failures pending with backoff metadata', async () => {
    await seedAuthLog();
    mockSyncOfflineAuthLogs.mockRejectedValueOnce({
      message: 'No internet connection.',
      isNetworkError: true,
    });

    await expect(offlineSyncService.syncPendingLogs()).rejects.toMatchObject({
      message: 'No internet connection.',
    });

    const logs = await offlineDatabaseService.getAllLogs();
    expect(logs[0]).toMatchObject({
      syncStatus: 'PENDING',
      syncAttemptCount: 1,
      lastSyncError: 'No internet connection.',
    });
    expect(logs[0].lastSyncAttemptAt).toBeTruthy();
    expect(logs[0].nextSyncAttemptAt).toBeTruthy();
  });

  it('marks backend-rejected logs failed and supports resetting them', async () => {
    const logId = await seedAuthLog();
    mockSyncOfflineAuthLogs.mockResolvedValueOnce({
      success: true,
      data: {
        syncedCount: 0,
        failedLogIds: [logId],
      },
    });

    const result = await offlineSyncService.syncPendingLogs({force: true});

    expect(result).toMatchObject({
      attemptedCount: 1,
      syncedCount: 0,
      failedCount: 1,
    });

    let logs = await offlineDatabaseService.getAllLogs();
    expect(logs[0]).toMatchObject({
      syncStatus: 'FAILED',
      syncAttemptCount: 1,
      lastSyncError: 'Backend rejected this log during sync.',
      nextSyncAttemptAt: null,
    });

    const resetCount = await offlineDatabaseService.resetFailedSyncLogs();
    logs = await offlineDatabaseService.getAllLogs();
    expect(resetCount).toBe(1);
    expect(logs[0]).toMatchObject({
      syncStatus: 'PENDING',
      lastSyncError: null,
      nextSyncAttemptAt: null,
    });
  });
});

async function seedAuthLog(): Promise<number> {
  const logId = await offlineDatabaseService.logAuthAttempt({
    employeeId: 'EMP001',
    authStatus: 'SUCCESS',
    failureReason: null,
    similarityScore: 0.91,
    livenessStatus: 'PASSED',
    challengeType: 'BLINK',
    deviceId: 'device-001',
    modelVersion: 'MobileFaceNet',
  });

  expect(typeof logId).toBe('number');
  return logId as number;
}
