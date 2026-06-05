import type {DeviceLocationContext} from './LocationTypes';

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
  syncAttemptCount?: number;
  lastSyncAttemptAt?: string;
  lastSyncError?: string;
  nextSyncAttemptAt?: string;
} & DeviceLocationContext;
