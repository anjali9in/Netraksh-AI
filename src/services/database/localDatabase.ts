import {DATABASE_CONFIG} from '../../config/databaseConfig';
import {runMigrations} from './migrations';
import type {LocalDatabase} from './databaseTypes';
import {SqliteDatabase} from './sqliteDatabase';

let databasePromise: Promise<LocalDatabase> | null = null;

export function getLocalDatabase(): Promise<LocalDatabase> {
  if (!databasePromise) {
    databasePromise = createAndInitializeDatabase();
  }

  return databasePromise;
}

export async function resetLocalDatabaseConnection(): Promise<void> {
  if (!databasePromise) {
    return;
  }

  const database = await databasePromise;
  await database.close();
  databasePromise = null;
}

async function createAndInitializeDatabase(): Promise<LocalDatabase> {
  const database = createDatabaseAdapter();
  await runMigrations(database);
  return database;
}

function createDatabaseAdapter(): LocalDatabase {
  switch (DATABASE_CONFIG.provider) {
    case 'sqlite':
      return new SqliteDatabase(DATABASE_CONFIG);
    default:
      throw new Error(
        `Unsupported database provider: ${DATABASE_CONFIG.provider}`,
      );
  }
}
