import {
  AppState,
  NativeEventEmitter,
  NativeModules,
  Platform,
  type EmitterSubscription,
} from 'react-native';

import {AUTH_LOG_SYNC_INTERVAL_MS} from '../../config/env';
import {logger} from '../../utils/logger';
import {connectivitySyncService} from '../network/connectivitySyncService';

type BackgroundSyncNativeModule = {
  scheduleBackgroundSync?: (intervalMs: number) => Promise<void>;
  cancelBackgroundSync?: () => Promise<void>;
  consumePendingLaunchSync?: () => Promise<boolean>;
};

const BACKGROUND_SYNC_EVENT = 'BackgroundSyncRequested';

function getNativeModule(): BackgroundSyncNativeModule {
  return NativeModules.BackgroundSyncModule ?? {};
}

let eventSubscription: EmitterSubscription | null = null;
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null =
  null;
let initialized = false;

async function runLaunchFallbackSync(): Promise<void> {
  try {
    const pending =
      (await getNativeModule().consumePendingLaunchSync?.()) ?? false;

    if (pending) {
      logger.info('[BackgroundSync] Running pending launch fallback sync');
      await connectivitySyncService.runOnlineSync();
    }
  } catch (error) {
    logger.warn('[BackgroundSync] Launch fallback sync failed', error);
  }
}

function subscribeToNativeSyncRequests(): void {
  const nativeModule = getNativeModule();
  if (!nativeModule.scheduleBackgroundSync) {
    return;
  }

  const eventEmitter = new NativeEventEmitter(
    NativeModules.BackgroundSyncModule,
  );

  eventSubscription?.remove();
  eventSubscription = eventEmitter.addListener(BACKGROUND_SYNC_EVENT, () => {
    logger.info('[BackgroundSync] Native background sync requested');
    void connectivitySyncService.runOnlineSync();
  });
}

export async function initializeBackgroundSync(
  intervalMs: number = AUTH_LOG_SYNC_INTERVAL_MS,
): Promise<void> {
  if (initialized) {
    return;
  }

  initialized = true;
  subscribeToNativeSyncRequests();

  const nativeModule = getNativeModule();
  if (nativeModule.scheduleBackgroundSync) {
    try {
      await nativeModule.scheduleBackgroundSync(intervalMs);
      logger.info('[BackgroundSync] Native scheduler registered', {
        platform: Platform.OS,
        intervalMs,
      });
    } catch (error) {
      logger.warn('[BackgroundSync] Failed to register native scheduler', error);
    }
  }

  if (Platform.OS === 'ios') {
    await runLaunchFallbackSync();

    appStateSubscription?.remove();
    appStateSubscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        void runLaunchFallbackSync();
      }
    });
  }
}

export function stopBackgroundSync(): void {
  eventSubscription?.remove();
  eventSubscription = null;
  appStateSubscription?.remove();
  appStateSubscription = null;
  initialized = false;

  void getNativeModule().cancelBackgroundSync?.();
}

export const backgroundSyncService = {
  initializeBackgroundSync,
  stopBackgroundSync,
  runLaunchFallbackSync,
};
