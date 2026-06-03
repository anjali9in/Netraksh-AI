import axios, {AxiosHeaders} from 'axios';
import type {InternalAxiosRequestConfig} from 'axios';

import {API_BASE_URL, API_TIMEOUT_MS} from '../../config/env';
import {networkService} from '../network/networkService';
import {secureStorage} from '../storage/secureStorage';
import {logger} from '../../utils/logger';
import {deviceInfoService} from '../device/deviceInfo';
import type {DeviceProfile} from '../device/deviceInfo';
import {deviceContextService} from '../location/deviceContextService';
import {createOfflineApiError, normalizeApiError} from './apiError';

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use(async config => {
  const online = await networkService.isOnline();

  if (!online) {
    return Promise.reject(createOfflineApiError());
  }

  const accessToken = await secureStorage.getAccessToken();

  if (accessToken) {
    attachAuthorizationHeader(config, accessToken);
  }

  try {
    const [profile, location] = await Promise.all([
      deviceInfoService.getDeviceProfile(),
      deviceContextService.getCachedDeviceLocationContext(),
    ]);
    attachDeviceHeaders(config, profile, location);
  } catch (error) {
    logger.warn('[Device Info] Unable to attach device headers', error);
  }

  logger.debug('[API Request]', {
    method: config.method?.toUpperCase(),
    url: config.url,
  });

  return config;
});

axiosClient.interceptors.response.use(
  response => response.data,
  async error => {
    const normalizedError = normalizeApiError(error);

    if (normalizedError.status === 401) {
      await secureStorage.clearTokens();
      // TODO: Add refresh-token retry flow when backend auth contract is final.
    }

    logger.warn('[API Error]', normalizedError);

    return Promise.reject(normalizedError);
  },
);

function attachAuthorizationHeader(
  config: InternalAxiosRequestConfig,
  accessToken: string,
) {
  const headers = AxiosHeaders.from(config.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  config.headers = headers;
}

function attachDeviceHeaders(
  config: InternalAxiosRequestConfig,
  profile: DeviceProfile,
  location: Awaited<
    ReturnType<typeof deviceContextService.getCachedDeviceLocationContext>
  >,
) {
  const headers = AxiosHeaders.from(config.headers);
  headers.set('X-Device-Id', profile.deviceId);
  headers.set('X-Device-Platform', profile.platform);

  if (profile.manufacturer) {
    headers.set('X-Device-Manufacturer', profile.manufacturer);
  }

  if (profile.model) {
    headers.set('X-Device-Model', profile.model);
  }

  if (profile.androidSdkVersion !== undefined) {
    headers.set('X-Android-Sdk', String(profile.androidSdkVersion));
  }

  if (location.latitude !== undefined) {
    headers.set('X-Device-Latitude', String(location.latitude));
  }

  if (location.longitude !== undefined) {
    headers.set('X-Device-Longitude', String(location.longitude));
  }

  if (location.ipAddress) {
    headers.set('X-Device-Ip', location.ipAddress);
  }

  config.headers = headers;
}

export default axiosClient;
