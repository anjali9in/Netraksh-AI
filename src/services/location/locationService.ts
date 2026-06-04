import Geolocation from '@react-native-community/geolocation';
import {AppState, Linking, Platform} from 'react-native';

import type {GpsCoordinates} from '../../types/LocationTypes';
import {appPermissionsService} from '../permissions/appPermissionsService';
import {logger} from '../../utils/logger';

const GPS_TIMEOUT_MS = 15000;

function waitForActiveAppState(): Promise<void> {
  if (AppState.currentState === 'active') {
    return Promise.resolve();
  }

  return new Promise(resolve => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        subscription.remove();
        resolve();
      }
    });
  });
}

function readPosition(enableHighAccuracy: boolean): Promise<GpsCoordinates> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude:
            position.coords.altitude !== null &&
            position.coords.altitude !== undefined
              ? position.coords.altitude
              : undefined,
        });
      },
      error => reject(error),
      {
        enableHighAccuracy,
        timeout: GPS_TIMEOUT_MS,
        maximumAge: 60000,
      },
    );
  });
}

async function readPositionWithFallback(): Promise<GpsCoordinates> {
  try {
    return await readPosition(true);
  } catch (highAccuracyError) {
    logger.warn('[Location] High-accuracy GPS failed, retrying', highAccuracyError);
    return readPosition(false);
  }
}

export async function getCurrentGpsCoordinates(): Promise<
  GpsCoordinates | undefined
> {
  await waitForActiveAppState();

  const permissions = await appPermissionsService.checkAppPermissions();

  if (permissions.location !== 'granted') {
    const requested = await appPermissionsService.requestAppPermissions();

    if (requested.location !== 'granted') {
      logger.warn(
        '[Location] Location permission not granted. Enable it in Settings.',
      );
      return undefined;
    }
  }

  if (Platform.OS === 'ios') {
    await new Promise<void>(resolve => {
      Geolocation.requestAuthorization(() => resolve(), () => resolve());
    });
  }

  try {
    return await readPositionWithFallback();
  } catch (error: any) {
    const code = error?.code;
    logger.warn('[Location] GPS read failed', error);

    if (code === 2) {
      logger.warn(
        '[Location] Turn on device Location/GPS in system settings for coordinates.',
      );
    }

    return undefined;
  }
}

export async function openLocationSettings(): Promise<void> {
  await Linking.openSettings();
}

export const locationService = {
  getCurrentGpsCoordinates,
  openLocationSettings,
};
