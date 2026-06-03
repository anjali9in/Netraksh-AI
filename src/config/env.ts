export const API_BASE_URL =
  'https://iy86kge7h4.execute-api.ap-south-1.amazonaws.com';
export const API_TIMEOUT_MS = 15000;
export const DATABASE_PROVIDER = 'sqlite';
export const DATABASE_NAME = 'netraksh_ai.sqlite';
export const DATABASE_LOCATION = 'default';
export const DATABASE_SCHEMA_VERSION = 1;
export const DATABASE_ENCRYPTION_ENABLED = false;

// Keep environment values centralized so this can move to react-native-config,
// Expo env, or native build config without changing API callers.
export const ENV = {
  API_BASE_URL,
  API_TIMEOUT_MS,
  DATABASE_PROVIDER,
  DATABASE_NAME,
  DATABASE_LOCATION,
  DATABASE_SCHEMA_VERSION,
  DATABASE_ENCRYPTION_ENABLED,
} as const;
