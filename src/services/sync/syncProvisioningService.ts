import {secureStorage} from '../storage/secureStorage';

export type SyncProvisioningStatus = {
  hasSyncToken: boolean;
};

function normalizeBearerToken(token: string): string {
  const trimmed = token.trim();

  if (trimmed.toLowerCase() === 'bearer') {
    return '';
  }

  if (/^bearer\s+/i.test(trimmed)) {
    return trimmed.replace(/^bearer\s+/i, '').trim();
  }

  return trimmed;
}

export async function getSyncProvisioningStatus(): Promise<SyncProvisioningStatus> {
  const accessToken = await secureStorage.getAccessToken();

  return {
    hasSyncToken: Boolean(accessToken),
  };
}

export async function saveSyncBearerToken(token: string): Promise<void> {
  const normalizedToken = normalizeBearerToken(token);

  if (!normalizedToken) {
    throw new Error('Sync bearer token is required.');
  }

  await secureStorage.saveTokens(normalizedToken);
}

export async function clearSyncBearerToken(): Promise<void> {
  await secureStorage.clearTokens();
}

export const syncProvisioningService = {
  clearSyncBearerToken,
  getSyncProvisioningStatus,
  saveSyncBearerToken,
};
