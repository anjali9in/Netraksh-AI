import type {NetInfoSubscription} from '@react-native-community/netinfo';

import {deviceContextService} from '../location/deviceContextService';
import {offlineSyncService} from '../OfflineSyncService';
import {logger} from '../../utils/logger';
import {networkService} from './networkService';

let subscription: NetInfoSubscription | null = null;
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

export function startConnectivitySync(): void {
  if (subscription) {
    return;
  }

  networkService.isOnline().then(online => {
    wasOnline = online;
  });

  subscription = networkService.subscribeToNetworkChanges(online => {
    if (online && !wasOnline) {
      void runOnlineSync();
    }

    wasOnline = online;
  });
}

export function stopConnectivitySync(): void {
  subscription?.();
  subscription = null;
  wasOnline = false;
  syncInFlight = false;
}

export const connectivitySyncService = {
  startConnectivitySync,
  stopConnectivitySync,
  runOnlineSync,
};
