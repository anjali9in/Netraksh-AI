import type {APIGatewayProxyEventV2} from 'aws-lambda';

import type {AuthLog} from './authLogTypes';
import {CONFIG} from './config';

export type AuthorizedSyncContext = {
  tenantId: string;
  deviceId: string;
};

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 401 | 403,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export function authorizeSyncRequest(
  event: APIGatewayProxyEventV2,
): AuthorizedSyncContext {
  const headers = normalizeHeaders(event.headers ?? {});
  const token = parseBearerToken(headers.authorization);
  const tenantId = headers['x-tenant-id'];
  const deviceId = headers['x-device-id'];

  if (CONFIG.syncAuthTokens.length === 0) {
    throw new AuthError('Sync authentication is not configured.', 401);
  }

  if (!token || !includesConstantTime(CONFIG.syncAuthTokens, token)) {
    throw new AuthError('Invalid or missing bearer token.', 401);
  }

  if (!tenantId) {
    throw new AuthError('X-Tenant-Id header is required.', 403);
  }

  if (!isAllowed(CONFIG.allowedTenantIds, tenantId)) {
    throw new AuthError('Tenant is not authorized for sync.', 403);
  }

  if (!deviceId) {
    throw new AuthError('X-Device-Id header is required.', 403);
  }

  if (!isAllowed(CONFIG.allowedDeviceIds, deviceId)) {
    throw new AuthError('Device is not authorized for sync.', 403);
  }

  return {tenantId, deviceId};
}

export function assertLogsBelongToAuthorizedDevice(
  logs: AuthLog[],
  context: AuthorizedSyncContext,
): void {
  const mismatchedLog = logs.find(log => log.deviceId !== context.deviceId);

  if (mismatchedLog) {
    throw new AuthError(
      `Log deviceId ${mismatchedLog.deviceId} does not match authorized device.`,
      403,
    );
  }
}

function normalizeHeaders(
  headers: Record<string, string | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      .map(([key, value]) => [key.toLowerCase(), value.trim()]),
  );
}

function parseBearerToken(headerValue: string | undefined): string | null {
  if (!headerValue) {
    return null;
  }

  const match = /^Bearer\s+(.+)$/i.exec(headerValue);
  return match?.[1]?.trim() || null;
}

function isAllowed(allowedValues: string[], value: string): boolean {
  if (allowedValues.length === 0) {
    return false;
  }

  return allowedValues.includes('*') || allowedValues.includes(value);
}

function includesConstantTime(allowedValues: string[], value: string): boolean {
  return allowedValues.some(allowed => timingSafeEqual(allowed, value));
}

function timingSafeEqual(left: string, right: string): boolean {
  const maxLength = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;

  for (let i = 0; i < maxLength; i++) {
    difference |= (left.charCodeAt(i) || 0) ^ (right.charCodeAt(i) || 0);
  }

  return difference === 0;
}
