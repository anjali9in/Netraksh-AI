import type {LocalDatabase, Migration} from './databaseTypes';

export const MIGRATIONS: Migration[] = [
  {
    id: 1,
    name: 'create_initial_offline_tables',
    statements: [
      `CREATE TABLE IF NOT EXISTS employee_face_templates (
        employee_id TEXT PRIMARY KEY NOT NULL,
        encrypted_embedding TEXT NOT NULL,
        model_version TEXT NOT NULL,
        device_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS auth_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT NOT NULL,
        auth_status TEXT NOT NULL CHECK (auth_status IN ('SUCCESS', 'FAILED')),
        failure_reason TEXT,
        similarity_score REAL,
        liveness_status TEXT NOT NULL CHECK (liveness_status IN ('PASSED', 'FAILED')),
        challenge_type TEXT NOT NULL CHECK (challenge_type IN ('BLINK', 'SMILE', 'HEAD_TURN')),
        device_id TEXT NOT NULL,
        model_version TEXT NOT NULL,
        created_at TEXT NOT NULL,
        sync_status TEXT NOT NULL CHECK (sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
        log_hash TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_auth_logs_sync_status_created_at
        ON auth_logs (sync_status, created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_auth_logs_employee_id_created_at
        ON auth_logs (employee_id, created_at)`,
    ],
  },
  {
    id: 2,
    name: 'create_users_table',
    statements: [
      `CREATE TABLE IF NOT EXISTS users (
        employee_id TEXT PRIMARY KEY NOT NULL,
        full_name TEXT NOT NULL,
        department TEXT,
        designation TEXT,
        site_id TEXT,
        phone TEXT,
        email TEXT,
        status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL CHECK (sync_status IN ('PENDING', 'SYNCED', 'FAILED'))
      )`,
      `CREATE INDEX IF NOT EXISTS idx_users_sync_status_updated_at
        ON users (sync_status, updated_at)`,
      `CREATE INDEX IF NOT EXISTS idx_users_status
        ON users (status)`,
    ],
  },
];

export async function runMigrations(database: LocalDatabase): Promise<void> {
  await database.execute(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )`,
  );

  const appliedMigrationIds = await getAppliedMigrationIds(database);
  const pendingMigrations = MIGRATIONS.filter(
    migration => !appliedMigrationIds.has(migration.id),
  );

  for (const migration of pendingMigrations) {
    await database.transaction(async transaction => {
      for (const statement of migration.statements) {
        await transaction.execute(statement);
      }

      await transaction.execute(
        `INSERT INTO schema_migrations (id, name, applied_at)
          VALUES (?, ?, ?)`,
        [migration.id, migration.name, new Date().toISOString()],
      );
    });
  }
}

async function getAppliedMigrationIds(
  database: LocalDatabase,
): Promise<Set<number>> {
  const result = await database.execute('SELECT id FROM schema_migrations');

  return new Set(
    result.rows
      .map(row => row.id)
      .filter((id): id is number => typeof id === 'number'),
  );
}
