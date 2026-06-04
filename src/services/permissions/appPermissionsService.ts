import {Platform} from 'react-native';
import {
  PERMISSIONS,
  RESULTS,
  check,
  checkNotifications,
  request,
  requestNotifications,
} from 'react-native-permissions';

import type {
  AppPermissionSummary,
  LocationPermissionState,
} from '../../types/LocationTypes';
import {logger} from '../../utils/logger';

function mapResult(result: string): LocationPermissionState {
  switch (result) {
    case RESULTS.GRANTED:
    case RESULTS.LIMITED:
      return 'granted';
    case RESULTS.BLOCKED:
      return 'blocked';
    case RESULTS.UNAVAILABLE:
      return 'unavailable';
    case RESULTS.DENIED:
    default:
      return 'denied';
  }
}

function getLocationPermission() {
  if (Platform.OS === 'ios') {
    return PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;
  }

  return PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
}

async function requestNotificationPermission(): Promise<LocationPermissionState> {
  if (Platform.OS === 'android' && Platform.Version < 33) {
    return 'granted';
  }

  try {
    const current = await checkNotifications();
    if (current.status === RESULTS.GRANTED) {
      return 'granted';
    }

    const response = await requestNotifications(['alert', 'sound', 'badge']);
    return mapResult(response.status);
  } catch (error) {
    logger.warn('[Permissions] Notification permission failed', error);
    return 'unavailable';
  }
}

async function requestLocationPermission(): Promise<LocationPermissionState> {
  try {
    const permission = getLocationPermission();
    const current = await check(permission);

    if (current === RESULTS.GRANTED || current === RESULTS.LIMITED) {
      return 'granted';
    }

    if (current === RESULTS.BLOCKED) {
      return 'blocked';
    }

    const result = await request(permission);
    return mapResult(result);
  } catch (error) {
    logger.warn('[Permissions] Location permission failed', error);
    return 'unavailable';
  }
}

export async function requestAppPermissions(): Promise<AppPermissionSummary> {
  const [notifications, location] = await Promise.all([
    requestNotificationPermission(),
    requestLocationPermission(),
  ]);

  return {notifications, location};
}

export async function checkAppPermissions(): Promise<AppPermissionSummary> {
  const locationPermission = getLocationPermission();
  const [notificationCheck, locationCheck] = await Promise.all([
    checkNotifications().catch(() => ({status: RESULTS.UNAVAILABLE})),
    check(locationPermission).catch(() => RESULTS.UNAVAILABLE),
  ]);

  return {
    notifications: mapResult(notificationCheck.status),
    location: mapResult(locationCheck),
  };
}

export const appPermissionsService = {
  requestAppPermissions,
  checkAppPermissions,
};
