import {
  DATABASE_ENCRYPTION_ENABLED,
  DATABASE_LOCATION,
  DATABASE_NAME,
  DATABASE_PROVIDER,
  DATABASE_SCHEMA_VERSION,
} from './env';

export type DatabaseProvider = 'sqlite';

export type DatabaseConfig = {
  provider: DatabaseProvider;
  name: string;
  location: string;
  schemaVersion: number;
  encryptionEnabled: boolean;
};

export const DATABASE_CONFIG: DatabaseConfig = {
  provider: DATABASE_PROVIDER as DatabaseProvider,
  name: DATABASE_NAME,
  location: DATABASE_LOCATION,
  schemaVersion: DATABASE_SCHEMA_VERSION,
  encryptionEnabled: DATABASE_ENCRYPTION_ENABLED,
};
