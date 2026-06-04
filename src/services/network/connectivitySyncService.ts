import type {NetInfoSubscription} from '@react-native-community/netinfo';

import {deviceContextService} from '../location/deviceContextService';
import {offlineSyncService} from '../OfflineSyncService';
import {logger} from '../../utils/logger';
import {networkService} from './networkService';
import {AUTH_LOG_SYNC_INTERVAL_MS} from '../../config/env';

let subscription: NetInfoSubscription | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;
let wasOnline = false;
let syncInFlight = false;

async function runOnlineSync(): Promise<void> {
  if (syncInFlight) {
    return;
  }

  syncInFlight = true;

  try {
    await deviceContextService.refreshDeviceLocationContext();

    const result = await offlineSyncService.syncPendingLogs();

    if (result.attemptedCount > 0) {
      await deviceContextService.markDeviceContextSynced();
      logger.info('[ConnectivitySync] Synced pending logs', result);
    }
  } catch (error) {
    logger.warn('[ConnectivitySync] Online sync failed', error);
  } finally {
    syncInFlight = false;
  }
}

async function runScheduledSync(): Promise<void> {
  try {
    const online = await networkService.isOnline();

    if (!online) {
      return;
    }

    await runOnlineSync();
  } catch (error) {
    logger.warn('[ConnectivitySync] Scheduled sync check failed', error);
  }
}

export function startConnectivitySync(
  syncIntervalMs: number = AUTH_LOG_SYNC_INTERVAL_MS,
): void {
  if (subscription) {
    return;
  }

  networkService.isOnline().then(online => {
    wasOnline = online;

    if (online) {
      void runOnlineSync();
    }
  });

  subscription = networkService.subscribeToNetworkChanges(online => {
    if (online && !wasOnline) {
      void runOnlineSync();
    }

    wasOnline = online;
  });

  if (syncIntervalMs > 0) {
    intervalId = setInterval(() => {
      void runScheduledSync();
    }, syncIntervalMs);

    logger.info('[ConnectivitySync] Scheduled auth log sync started', {
      syncIntervalMs,
    });
  }
}

export function stopConnectivitySync(): void {
  subscription?.();
  subscription = null;

  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  wasOnline = false;
  syncInFlight = false;
}

export const connectivitySyncService = {
  startConnectivitySync,
  stopConnectivitySync,
  runOnlineSync,
  runScheduledSync,
};
