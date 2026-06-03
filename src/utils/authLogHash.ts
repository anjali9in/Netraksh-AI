import type {AuthLog} from '../types/LogTypes';
import {sha256} from './hash';

type HashableAuthLog = {
  employeeId: string;
  authStatus: AuthLog['authStatus'];
  failureReason?: string | null;
  similarityScore?: number | null;
  livenessStatus: AuthLog['livenessStatus'];
  challengeType: AuthLog['challengeType'];
  deviceId: string;
  modelVersion: string;
  createdAt: string;
  syncStatus: AuthLog['syncStatus'];
  latitude?: number | null;
  longitude?: number | null;
  locationAccuracy?: number | null;
  altitude?: number | null;
  ipAddress?: string | null;
  locationCapturedAt?: string | null;
};

export function generateAuthLogHash(log: HashableAuthLog): string {
  const payload = [
    log.employeeId,
    log.authStatus,
    log.failureReason ?? '',
    log.similarityScore != null ? log.similarityScore.toFixed(4) : '',
    log.livenessStatus,
    log.challengeType,
    log.deviceId,
    log.modelVersion,
    log.createdAt,
    log.syncStatus,
    log.latitude != null ? log.latitude.toFixed(6) : '',
    log.longitude != null ? log.longitude.toFixed(6) : '',
    log.locationAccuracy != null ? log.locationAccuracy.toFixed(2) : '',
    log.altitude != null ? log.altitude.toFixed(2) : '',
    log.ipAddress ?? '',
    log.locationCapturedAt ?? '',
  ].join('|');

  return sha256(payload);
}
