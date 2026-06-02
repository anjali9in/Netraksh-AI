jest.mock('react-native-keychain', () => ({
  getGenericPassword: jest.fn(),
  setGenericPassword: jest.fn(),
}));

import {
  createDeviceInstallId,
  formatDeviceLabel,
  resolveAndroidSdkVersion,
  sanitizeDeviceValue,
} from '../src/services/device/deviceInfo';

describe('deviceInfo helpers', () => {
  it('sanitizes optional native device values', () => {
    expect(sanitizeDeviceValue(' Pixel ')).toBe('Pixel');
    expect(sanitizeDeviceValue('')).toBeUndefined();
    expect(sanitizeDeviceValue(123)).toBeUndefined();
  });

  it('resolves Android SDK versions from platform values', () => {
    expect(resolveAndroidSdkVersion(36)).toBe(36);
    expect(resolveAndroidSdkVersion('35')).toBe(35);
    expect(resolveAndroidSdkVersion('android')).toBeUndefined();
  });

  it('creates an installation-scoped device id', () => {
    expect(createDeviceInstallId('android', 123456789, 0.5)).toMatch(
      /^netraksh-android-[a-z0-9]+-[a-z0-9]{10}$/,
    );
  });

  it('formats the best available device label', () => {
    expect(formatDeviceLabel({manufacturer: 'Google', model: 'Pixel 8'})).toBe(
      'Google Pixel 8',
    );
    expect(formatDeviceLabel({brand: 'Samsung'})).toBe('Samsung');
    expect(formatDeviceLabel({})).toBe('Unknown device');
  });
});
