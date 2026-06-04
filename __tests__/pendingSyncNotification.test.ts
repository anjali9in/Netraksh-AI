import {authLogRepository} from '../src/services/database/repositories/authLogRepository';
import {pendingSyncNotificationService} from '../src/services/sync/pendingSyncNotificationService';
import {NativeModules} from 'react-native';

jest.mock('../src/services/database/repositories/authLogRepository', () => ({
  authLogRepository: {
    countPendingSync: jest.fn(),
  },
}));

const mockCount = authLogRepository.countPendingSync as jest.Mock;

describe('pendingSyncNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    NativeModules.BackgroundSyncModule = {
      updatePendingSyncNotification: jest.fn().mockResolvedValue(undefined),
      clearPendingSyncNotification: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('shows native notification when logs are pending', async () => {
    mockCount.mockResolvedValue(3);

    const count =
      await pendingSyncNotificationService.refreshPendingSyncNotification();

    expect(count).toBe(3);
    expect(
      NativeModules.BackgroundSyncModule.updatePendingSyncNotification,
    ).toHaveBeenCalledWith(3);
  });

  it('clears native notification when nothing is pending', async () => {
    mockCount.mockResolvedValue(0);

    await pendingSyncNotificationService.refreshPendingSyncNotification();

    expect(
      NativeModules.BackgroundSyncModule.clearPendingSyncNotification,
    ).toHaveBeenCalled();
  });
});
