import type {DeviceLocationContext} from '../../types/LocationTypes';
import {deviceInfoService} from '../device/deviceInfo';
import {getLocalDatabase} from '../database/localDatabase';
import {networkService} from '../network/networkService';
import {logger} from '../../utils/logger';
import {ipService} from './ipService';
import {locationService} from './locationService';

let refreshInFlight: Promise<DeviceLocationContext> | null = null;

export async function refreshDeviceLocationContext(): Promise<DeviceLocationContext> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = captureAndPersistContext().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

async function captureAndPersistContext(): Promise<DeviceLocationContext> {
  const deviceId = await deviceInfoService.getDeviceId();
  const capturedAt = new Date().toISOString();
  const [gps, ipAddress] = await Promise.all([
    locationService.getCurrentGpsCoordinates(),
    networkService.isOnline().then(online =>
      online ? ipService.fetchPublicIpAddress() : undefined,
    ),
  ]);

  const context: DeviceLocationContext = {
    latitude: gps?.latitude,
    longitude: gps?.longitude,
    locationAccuracy: gps?.accuracy,
    altitude: gps?.altitude,
    ipAddress,
    locationCapturedAt: capturedAt,
  };

  await upsertDeviceContext(deviceId, context, capturedAt);

  logger.info('[DeviceContext] Location context updated', {
    hasGps: gps !== undefined,
    hasIp: Boolean(ipAddress),
  });

  return context;
}

export async function getCachedDeviceLocationContext(): Promise<DeviceLocationContext> {
  const deviceId = await deviceInfoService.getDeviceId();
  const database = await getLocalDatabase();
  const result = await database.execute(
    `SELECT latitude, longitude, location_accuracy, altitude, ip_address, location_captured_at
      FROM device_context
      WHERE device_id = ?
      LIMIT 1`,
    [deviceId],
  );

  const row = result.rows[0];

  if (!row) {
    return {};
  }

  return {
    latitude: toOptionalNumber(row.latitude),
    longitude: toOptionalNumber(row.longitude),
    locationAccuracy: toOptionalNumber(row.location_accuracy),
    altitude: toOptionalNumber(row.altitude),
    ipAddress: toOptionalString(row.ip_address),
    locationCapturedAt: toOptionalString(row.location_captured_at),
  };
}

async function upsertDeviceContext(
  deviceId: string,
  context: DeviceLocationContext,
  updatedAt: string,
): Promise<void> {
  const database = await getLocalDatabase();

  await database.execute(
    `INSERT INTO device_context (
      device_id,
      latitude,
      longitude,
      location_accuracy,
      altitude,
      ip_address,
      location_captured_at,
      updated_at,
      sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
    ON CONFLICT(device_id) DO UPDATE SET
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      location_accuracy = excluded.location_accuracy,
      altitude = excluded.altitude,
      ip_address = COALESCE(excluded.ip_address, device_context.ip_address),
      location_captured_at = excluded.location_captured_at,
      updated_at = excluded.updated_at,
      sync_status = 'PENDING'`,
    [
      deviceId,
      context.latitude ?? null,
      context.longitude ?? null,
      context.locationAccuracy ?? null,
      context.altitude ?? null,
      context.ipAddress ?? null,
      context.locationCapturedAt ?? updatedAt,
      updatedAt,
    ],
  );
}

export async function markDeviceContextSynced(): Promise<void> {
  const deviceId = await deviceInfoService.getDeviceId();
  const database = await getLocalDatabase();

  await database.execute(
    `UPDATE device_context SET sync_status = 'SYNCED' WHERE device_id = ?`,
    [deviceId],
  );
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

export const deviceContextService = {
  refreshDeviceLocationContext,
  getCachedDeviceLocationContext,
  markDeviceContextSynced,
};
