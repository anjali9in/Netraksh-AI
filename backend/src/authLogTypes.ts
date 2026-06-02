export type AuthLog = {
  id?: number;
  employeeId: string;
  authStatus: 'SUCCESS' | 'FAILED';
  failureReason?: string;
  similarityScore?: number;
  livenessStatus: 'PASSED' | 'FAILED';
  challengeType: 'BLINK' | 'SMILE' | 'HEAD_TURN';
  deviceId: string;
  modelVersion: string;
  createdAt: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  logHash?: string;
};

export type SyncAuthLogsRequest = {
  logs: AuthLog[];
};

export type SyncAuthLogsResult = {
  syncedCount: number;
  failedLogIds: number[];
};
