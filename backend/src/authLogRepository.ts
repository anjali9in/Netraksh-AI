import {PutCommand} from '@aws-sdk/lib-dynamodb';

import type {AuthorizedSyncContext} from './auth';
import type {AuthLog} from './authLogTypes';
import {CONFIG} from './config';
import {dynamoDbDocumentClient} from './dynamodbClient';

export async function saveAuthLog(
  authLog: AuthLog,
  context: AuthorizedSyncContext,
): Promise<void> {
  await dynamoDbDocumentClient.send(
    new PutCommand({
      TableName: CONFIG.authLogsTableName,
      Item: mapAuthLogItem(authLog, context),
    }),
  );
}

function mapAuthLogItem(authLog: AuthLog, context: AuthorizedSyncContext) {
  return {
    logId: buildLogId(authLog),
    tenantId: context.tenantId,
    localLogId: authLog.id,
    employeeId: authLog.employeeId,
    authStatus: authLog.authStatus,
    failureReason: authLog.failureReason,
    similarityScore: authLog.similarityScore,
    livenessStatus: authLog.livenessStatus,
    challengeType: authLog.challengeType,
    deviceId: authLog.deviceId,
    modelVersion: authLog.modelVersion,
    createdAt: authLog.createdAt,
    logHash: authLog.logHash,
    latitude: authLog.latitude,
    longitude: authLog.longitude,
    locationAccuracy: authLog.locationAccuracy,
    altitude: authLog.altitude,
    ipAddress: authLog.ipAddress,
    locationCapturedAt: authLog.locationCapturedAt,
    syncedAt: new Date().toISOString(),
  };
}

function buildLogId(authLog: AuthLog): string {
  if (typeof authLog.id === 'number') {
    return `${authLog.deviceId}#${authLog.id}`;
  }

  return `${authLog.deviceId}#${authLog.employeeId}#${authLog.createdAt}`;
}
