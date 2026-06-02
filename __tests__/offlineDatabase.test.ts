import {offlineDatabaseService} from '../src/services/OfflineDatabaseService';

describe('Offline Database Service Tests', () => {
  beforeEach(() => {
    // Reset our stateful in-memory database mock
    if (typeof (global as any).resetMockDatabase === 'function') {
      (global as any).resetMockDatabase();
    }
  });

  it('should initialize the database successfully', async () => {
    const success = await offlineDatabaseService.initDatabase();
    expect(success).toBe(true);
  });

  it('should log a new authentication attempt and verify its hash integrity', async () => {
    const logParam = {
      employeeId: 'EMP123',
      authStatus: 'SUCCESS' as const,
      failureReason: null,
      similarityScore: 0.85,
      livenessStatus: 'PASSED' as const,
      challengeType: 'BLINK' as const,
      deviceId: 'device-abc',
      modelVersion: 'ArcFace-MobileNetV2',
    };

    const insertId = await offlineDatabaseService.logAuthAttempt(logParam);
    expect(insertId).toBe(1);

    const logs = await offlineDatabaseService.getAllLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].employeeId).toBe('EMP123');
    expect(logs[0].authStatus).toBe('SUCCESS');
    expect(logs[0].syncStatus).toBe('PENDING');
    expect(logs[0].logHash).not.toBeNull();

    // Verify integrity hash matches
    const isIntegrityOk = offlineDatabaseService.verifyLogIntegrity(logs[0]);
    expect(isIntegrityOk).toBe(true);
  });

  it('should retrieve pending logs and mark them as synchronized', async () => {
    // Log two attempts
    await offlineDatabaseService.logAuthAttempt({
      employeeId: 'EMP001',
      authStatus: 'SUCCESS',
      failureReason: null,
      similarityScore: 0.76,
      livenessStatus: 'PASSED',
      challengeType: 'SMILE',
      deviceId: 'test-device',
      modelVersion: 'ArcFace-MobileNetV2',
    });

    await offlineDatabaseService.logAuthAttempt({
      employeeId: 'EMP002',
      authStatus: 'FAILED',
      failureReason: 'Liveness Failed',
      similarityScore: 0.51,
      livenessStatus: 'FAILED',
      challengeType: 'HEAD_TURN',
      deviceId: 'test-device',
      modelVersion: 'ArcFace-MobileNetV2',
    });

    // Check pending count
    const pending = await offlineDatabaseService.getPendingLogs();
    expect(pending.length).toBe(2);

    // Sync them
    const idsToSync = pending.map(p => p.id!).filter(Boolean);
    const syncSuccess = await offlineDatabaseService.markLogsAsSynced(
      idsToSync,
    );
    expect(syncSuccess).toBe(true);

    // Verify they are no longer pending
    const remainingPending = await offlineDatabaseService.getPendingLogs();
    expect(remainingPending.length).toBe(0);

    // Check that hashes were updated to reflect the new syncStatus
    const allLogs = await offlineDatabaseService.getAllLogs();
    expect(allLogs.every(l => l.syncStatus === 'SYNCED')).toBe(true);
    expect(
      allLogs.every(l => offlineDatabaseService.verifyLogIntegrity(l)),
    ).toBe(true);
  });

  it('should purge old synchronized logs', async () => {
    // Log one attempt and mark as synced
    const id = await offlineDatabaseService.logAuthAttempt({
      employeeId: 'EMP009',
      authStatus: 'SUCCESS',
      failureReason: null,
      similarityScore: 0.81,
      livenessStatus: 'PASSED',
      challengeType: 'BLINK',
      deviceId: 'test-device',
      modelVersion: 'ArcFace-MobileNetV2',
    });

    await offlineDatabaseService.markLogsAsSynced([id!]);

    // Force edit the date in the mock to make it older (e.g. 40 days ago)
    const fortyDaysAgo = new Date();
    fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);

    const dbLog = (global as any).mockDbState.logs[0];
    dbLog.created_at = fortyDaysAgo.toISOString();

    // Re-hash to keep integrity valid
    const logs = await offlineDatabaseService.getAllLogs();
    const mappedLog = logs[0];
    mappedLog.createdAt = fortyDaysAgo.toISOString();
    const rest = {...mappedLog};
    delete (rest as any).id;
    delete (rest as any).logHash;
    dbLog.log_hash = offlineDatabaseService.generateLogHash(rest);

    // Update in mock stateful DB
    const globalState = global as any;
    if (globalState.resetMockDatabase) {
      // The stateful mock stores inside mockDbState, let's execute clearSyncedLogs
      const purgedCount = await offlineDatabaseService.clearSyncedLogs(30);
      expect(purgedCount).toBe(1);

      const remaining = await offlineDatabaseService.getAllLogs();
      expect(remaining.length).toBe(0);
    }
  });
});
