import {NativeModules} from 'react-native';

import {backgroundSyncService} from '../src/services/sync/backgroundSyncService';
import {connectivitySyncService} from '../src/services/network/connectivitySyncService';

jest.mock('../src/services/network/connectivitySyncService', () => ({
  connectivitySyncService: {
    runOnlineSync: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('backgroundSyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    NativeModules.BackgroundSyncModule = {
      scheduleBackgroundSync: jest.fn().mockResolvedValue(undefined),
      cancelBackgroundSync: jest.fn().mockResolvedValue(undefined),
      consumePendingLaunchSync: jest.fn().mockResolvedValue(false),
      updatePendingSyncNotification: jest.fn().mockResolvedValue(undefined),
      clearPendingSyncNotification: jest.fn().mockResolvedValue(undefined),
    };
    backgroundSyncService.stopBackgroundSync();
  });

  it('registers native background sync on initialize', async () => {
    await backgroundSyncService.initializeBackgroundSync(300000);

    expect(
      NativeModules.BackgroundSyncModule.scheduleBackgroundSync,
    ).toHaveBeenCalledWith(300000);
  });
});
