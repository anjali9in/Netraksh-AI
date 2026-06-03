import type {AuthLog} from '../types/LogTypes';
import {sha256} from './hash';

type HashableAuthLog = Pick<
  AuthLog,
  | 'employeeId'
  | 'authStatus'
  | 'failureReason'
  | 'similarityScore'
  | 'livenessStatus'
  | 'challengeType'
  | 'deviceId'
  | 'modelVersion'
  | 'createdAt'
  | 'syncStatus'
>;

export function generateAuthLogHash(log: HashableAuthLog): string {
  const payload = [
    log.employeeId,
    log.authStatus,
    log.failureReason ?? '',
    log.similarityScore !== undefined ? log.similarityScore.toFixed(4) : '',
    log.livenessStatus,
    log.challengeType,
    log.deviceId,
    log.modelVersion,
    log.createdAt,
    log.syncStatus,
  ].join('|');

  return sha256(payload);
}
