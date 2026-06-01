export const API_BASE_URL = 'https://api.example.com';
export const API_TIMEOUT_MS = 15000;

// Keep environment values centralized so this can move to react-native-config,
// Expo env, or native build config without changing API callers.
export const ENV = {
  API_BASE_URL,
  API_TIMEOUT_MS,
} as const;
