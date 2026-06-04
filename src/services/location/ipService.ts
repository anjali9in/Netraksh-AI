import {networkService} from '../network/networkService';
import {logger} from '../../utils/logger';

const IPIFY_URL = 'https://api.ipify.org?format=json';
const FETCH_TIMEOUT_MS = 8000;

type IpifyResponse = {
  ip?: string;
};

export async function fetchPublicIpAddress(): Promise<string | undefined> {
  const online = await networkService.isOnline();

  if (!online) {
    return undefined;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(IPIFY_URL, {
      signal: controller.signal,
      headers: {Accept: 'application/json'},
    });

    if (!response.ok) {
      return undefined;
    }

    const payload = (await response.json()) as IpifyResponse;
    const ip = payload.ip?.trim();

    return ip && ip.length > 0 ? ip : undefined;
  } catch (error) {
    logger.warn('[IP] Unable to resolve public IP', error);
    return undefined;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const ipService = {
  fetchPublicIpAddress,
};
