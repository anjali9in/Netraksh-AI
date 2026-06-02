import {Platform} from 'react-native';
import * as Keychain from 'react-native-keychain';

export type DeviceProfile = {
  deviceId: string;
  platform: string;
  isAndroid: boolean;
  manufacturer?: string;
  brand?: string;
  model?: string;
  osVersion: string;
  androidSdkVersion?: number;
};

type DeviceConstants = {
  Manufacturer?: unknown;
  Brand?: unknown;
  Model?: unknown;
  Release?: unknown;
};

const DEVICE_ID_SERVICE = 'netraksh-ai.device-id';
const DEVICE_ID_USERNAME = 'device';
const DEVICE_ID_PREFIX = 'netraksh';

export function sanitizeDeviceValue(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function resolveAndroidSdkVersion(
  platformVersion: string | number,
): number | undefined {
  if (typeof platformVersion === 'number') {
    return Number.isFinite(platformVersion) ? platformVersion : undefined;
  }

  const parsed = Number(platformVersion);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function createDeviceInstallId(
  platform: string = Platform.OS,
  timestamp: number = Date.now(),
  randomValue: number = Math.random(),
): string {
  const timestampPart = Math.max(timestamp, 0).toString(36);
  const randomPart = randomValue.toString(36).slice(2, 12).padEnd(10, '0');

  return `${DEVICE_ID_PREFIX}-${platform}-${timestampPart}-${randomPart}`;
}

export async function getDeviceId(): Promise<string> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: DEVICE_ID_SERVICE,
    });

    if (credentials && credentials.password) {
      return credentials.password;
    }
  } catch {
    // Fall through to an ephemeral ID so device metadata never blocks app use.
  }

  const deviceId = createDeviceInstallId();

  try {
    await Keychain.setGenericPassword(DEVICE_ID_USERNAME, deviceId, {
      service: DEVICE_ID_SERVICE,
    });
  } catch {
    // The generated ID still identifies this app run even if secure storage fails.
  }

  return deviceId;
}

export async function getDeviceProfile(): Promise<DeviceProfile> {
  const constants = Platform.constants as DeviceConstants;
  const androidSdkVersion =
    Platform.OS === 'android'
      ? resolveAndroidSdkVersion(Platform.Version)
      : undefined;

  return {
    deviceId: await getDeviceId(),
    platform: Platform.OS,
    isAndroid: Platform.OS === 'android',
    manufacturer: sanitizeDeviceValue(constants.Manufacturer),
    brand: sanitizeDeviceValue(constants.Brand),
    model: sanitizeDeviceValue(constants.Model),
    osVersion: String(constants.Release ?? Platform.Version),
    androidSdkVersion,
  };
}

export function formatDeviceLabel(
  profile: Pick<DeviceProfile, 'brand' | 'manufacturer' | 'model'>,
): string {
  const maker = profile.manufacturer ?? profile.brand;

  if (maker && profile.model) {
    return `${maker} ${profile.model}`;
  }

  return profile.model ?? maker ?? 'Unknown device';
}

export const deviceInfoService = {
  getDeviceId,
  getDeviceProfile,
  formatDeviceLabel,
};
