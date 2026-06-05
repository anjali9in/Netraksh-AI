import {secureStorage} from '../src/services/storage/secureStorage';
import {syncProvisioningService} from '../src/services/sync/syncProvisioningService';

jest.mock('../src/services/storage/secureStorage', () => ({
  secureStorage: {
    clearTokens: jest.fn().mockResolvedValue(undefined),
    getAccessToken: jest.fn().mockResolvedValue(null),
    saveTokens: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('syncProvisioningService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves a manually issued sync bearer token without the Bearer prefix', async () => {
    await syncProvisioningService.saveSyncBearerToken('Bearer token-123');

    expect(secureStorage.saveTokens).toHaveBeenCalledWith('token-123');
  });

  it('reports whether the device has a provisioned sync token', async () => {
    (secureStorage.getAccessToken as jest.Mock).mockResolvedValue('token-123');

    await expect(
      syncProvisioningService.getSyncProvisioningStatus(),
    ).resolves.toEqual({hasSyncToken: true});
  });

  it('rejects empty sync tokens', async () => {
    await expect(
      syncProvisioningService.saveSyncBearerToken('Bearer   '),
    ).rejects.toThrow('Sync bearer token is required.');
  });
});
