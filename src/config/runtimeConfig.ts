import {NativeModules} from 'react-native';

export type RuntimeConfig = {
  apiBaseUrl: string;
  apiTenantId: string;
  apiSiteId: string;
  apiTimeoutMs: number;
  authLogSyncIntervalMs: number;
  databaseEncryptionEnabled: boolean;
  databaseLocation: string;
  databaseName: string;
  databaseProvider: string;
  databaseSchemaVersion: number;
  demoMode: boolean;
};

declare global {
  // Optional runtime override for tests, native bootstrap, or deployment shells.
  // eslint-disable-next-line no-var
  var __NETRAKSH_RUNTIME_CONFIG__: Partial<RuntimeConfig> | undefined;
}

const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  apiBaseUrl: 'https://iy86kge7h4.execute-api.ap-south-1.amazonaws.com',
  apiTenantId: 'default',
  apiSiteId: 'primary-site',
  apiTimeoutMs: 15000,
  authLogSyncIntervalMs: 5 * 60 * 1000,
  databaseEncryptionEnabled: false,
  databaseLocation: 'default',
  databaseName: 'netraksh_ai.sqlite',
  databaseProvider: 'sqlite',
  databaseSchemaVersion: 1,
  demoMode: false,
};

function getNativeRuntimeConfig(): Partial<RuntimeConfig> {
  return (NativeModules.NetrakshConfig?.runtimeConfig ?? {}) as Partial<
    RuntimeConfig
  >;
}

export function getRuntimeConfig(): RuntimeConfig {
  return {
    ...DEFAULT_RUNTIME_CONFIG,
    ...getNativeRuntimeConfig(),
    ...(global.__NETRAKSH_RUNTIME_CONFIG__ ?? {}),
  };
}

export const runtimeConfig = getRuntimeConfig();
