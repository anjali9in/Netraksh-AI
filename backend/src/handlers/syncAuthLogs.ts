import type {APIGatewayProxyEventV2} from 'aws-lambda';

import type {SyncAuthLogsResult} from '../authLogTypes';
import {
  assertLogsBelongToAuthorizedDevice,
  AuthError,
  authorizeSyncRequest,
} from '../auth';
import {emptyOptionsResponse, jsonResponse} from '../http';
import {saveAuthLog} from '../authLogRepository';
import {parseSyncAuthLogsRequest} from '../validation';

export async function handler(event: APIGatewayProxyEventV2) {
  if (event.requestContext.http.method === 'OPTIONS') {
    return emptyOptionsResponse();
  }

  try {
    const authContext = authorizeSyncRequest(event);
    const body = event.isBase64Encoded
      ? Buffer.from(event.body ?? '', 'base64').toString('utf8')
      : event.body ?? null;
    const request = parseSyncAuthLogsRequest(body);
    assertLogsBelongToAuthorizedDevice(request.logs, authContext);
    const failedLogIds: number[] = [];

    await Promise.all(
      request.logs.map(async authLog => {
        try {
          await saveAuthLog(authLog, authContext);
        } catch {
          if (typeof authLog.id === 'number') {
            failedLogIds.push(authLog.id);
          }
        }
      }),
    );

    const data: SyncAuthLogsResult = {
      syncedCount: request.logs.length - failedLogIds.length,
      failedLogIds,
    };

    return jsonResponse(200, {
      success: true,
      data,
    });
  } catch (error) {
    const statusCode = error instanceof AuthError ? error.statusCode : 400;

    return jsonResponse(statusCode, {
      success: false,
      data: {
        syncedCount: 0,
        failedLogIds: [],
      },
      message:
        error instanceof Error ? error.message : 'Unable to sync auth logs.',
    });
  }
}
