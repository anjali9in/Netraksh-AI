import {PutCommand} from '@aws-sdk/lib-dynamodb';

import type {AuthLog} from './authLogTypes';
import {CONFIG} from './config';
import {dynamoDbDocumentClient} from './dynamodbClient';

export async function saveAuthLog(authLog: AuthLog): Promise<void> {
  await dynamoDbDocumentClient.send(
    new PutCommand({
      TableName: CONFIG.authLogsTableName,
      Item: mapAuthLogItem(authLog),
    }),
  );
}

function mapAuthLogItem(authLog: AuthLog) {
  return {
    logId: buildLogId(authLog),
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
    syncedAt: new Date().toISOString(),
  };
}

function buildLogId(authLog: AuthLog): string {
  if (typeof authLog.id === 'number') {
    return `${authLog.deviceId}#${authLog.id}`;
  }

  return `${authLog.deviceId}#${authLog.employeeId}#${authLog.createdAt}`;
}
