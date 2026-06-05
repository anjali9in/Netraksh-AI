import {runtimeConfig} from './runtimeConfig';

export const API_BASE_URL = runtimeConfig.apiBaseUrl;
export const API_TIMEOUT_MS = runtimeConfig.apiTimeoutMs;
export const AUTH_LOG_SYNC_INTERVAL_MS = runtimeConfig.authLogSyncIntervalMs;
export const API_TENANT_ID = runtimeConfig.apiTenantId;
export const API_SITE_ID = runtimeConfig.apiSiteId;
export const DATABASE_PROVIDER = runtimeConfig.databaseProvider;
export const DATABASE_NAME = runtimeConfig.databaseName;
export const DATABASE_LOCATION = runtimeConfig.databaseLocation;
export const DATABASE_SCHEMA_VERSION = runtimeConfig.databaseSchemaVersion;
export const DATABASE_ENCRYPTION_ENABLED =
  runtimeConfig.databaseEncryptionEnabled;

// Keep environment values centralized so this can move to react-native-config,
// Expo env, or native build config without changing API callers.
export const ENV = {
  API_BASE_URL,
  API_TIMEOUT_MS,
  AUTH_LOG_SYNC_INTERVAL_MS,
  API_TENANT_ID,
  API_SITE_ID,
  DATABASE_PROVIDER,
  DATABASE_NAME,
  DATABASE_LOCATION,
  DATABASE_SCHEMA_VERSION,
  DATABASE_ENCRYPTION_ENABLED,
} as const;
