import {connectivitySyncService} from '../network/connectivitySyncService';
import {offlineDatabaseService} from '../OfflineDatabaseService';
import {refreshPendingSyncNotification} from './pendingSyncNotificationService';
import {logger} from '../../utils/logger';

/** Headless JS entry (Android WorkManager) and shared background sync runner. */
export async function runBackgroundSyncTask(): Promise<void> {
  try {
    await offlineDatabaseService.initDatabase();
    await refreshPendingSyncNotification();
    await connectivitySyncService.runOnlineSync();
    logger.info('[BackgroundSync] Background sync task finished');
  } catch (error) {
    logger.warn('[BackgroundSync] Background sync task failed', error);
    await refreshPendingSyncNotification();
    throw error;
  }
}
