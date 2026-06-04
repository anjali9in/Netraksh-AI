import {AppState, NativeModules, Platform} from 'react-native';

import {authLogRepository} from '../database/repositories/authLogRepository';
import {logger} from '../../utils/logger';

type PendingSyncNotificationNativeModule = {
  updatePendingSyncNotification?: (pendingCount: number) => Promise<void>;
  clearPendingSyncNotification?: () => Promise<void>;
};

function getNativeModule(): PendingSyncNotificationNativeModule {
  return NativeModules.BackgroundSyncModule ?? {};
}

let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null =
  null;

export async function refreshPendingSyncNotification(): Promise<number> {
  try {
    const pendingCount = await authLogRepository.countPendingSync();
    const nativeModule = getNativeModule();

    if (pendingCount > 0) {
      await nativeModule.updatePendingSyncNotification?.(pendingCount);
      logger.info('[PendingSyncNotification] Updated', {pendingCount});
    } else {
      await nativeModule.clearPendingSyncNotification?.();
      logger.info('[PendingSyncNotification] Cleared');
    }

    return pendingCount;
  } catch (error) {
    logger.warn('[PendingSyncNotification] Refresh failed', error);
    return 0;
  }
}

export function startPendingSyncNotificationWatcher(): void {
  if (appStateSubscription) {
    return;
  }

  appStateSubscription = AppState.addEventListener('change', nextState => {
    if (nextState === 'active') {
      void refreshPendingSyncNotification();
    }
  });
}

export function stopPendingSyncNotificationWatcher(): void {
  appStateSubscription?.remove();
  appStateSubscription = null;
}

export async function initializePendingSyncNotifications(): Promise<void> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return;
  }

  startPendingSyncNotificationWatcher();
  await refreshPendingSyncNotification();
}

export const pendingSyncNotificationService = {
  refreshPendingSyncNotification,
  initializePendingSyncNotifications,
  stopPendingSyncNotificationWatcher,
};
