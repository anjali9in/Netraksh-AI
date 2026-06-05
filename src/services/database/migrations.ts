import type {
  AddColumnMigrationStep,
  DatabaseRow,
  LocalDatabase,
  Migration,
  MigrationStep,
} from './databaseTypes';

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
  {
    id: 3,
    name: 'add_location_and_device_context',
    statements: [
      addColumn('auth_logs', 'latitude', 'REAL'),
      addColumn('auth_logs', 'longitude', 'REAL'),
      addColumn('auth_logs', 'location_accuracy', 'REAL'),
      addColumn('auth_logs', 'altitude', 'REAL'),
      addColumn('auth_logs', 'ip_address', 'TEXT'),
      addColumn('auth_logs', 'location_captured_at', 'TEXT'),
      `CREATE TABLE IF NOT EXISTS device_context (
        device_id TEXT PRIMARY KEY NOT NULL,
        latitude REAL,
        longitude REAL,
        location_accuracy REAL,
        altitude REAL,
        ip_address TEXT,
        location_captured_at TEXT,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL CHECK (sync_status IN ('PENDING', 'SYNCED', 'FAILED'))
      )`,
    ],
  },
  {
    id: 4,
    name: 'add_template_encryption_audit',
    statements: [
      addColumn(
        'employee_face_templates',
        'template_encryption_version',
        'TEXT',
      ),
      addColumn(
        'employee_face_templates',
        'migrated_from_encryption_version',
        'TEXT',
      ),
      addColumn('employee_face_templates', 'migrated_at', 'TEXT'),
    ],
  },
  {
    id: 5,
    name: 'add_auth_log_sync_retry_metadata',
    statements: [
      addColumn(
        'auth_logs',
        'sync_attempt_count',
        'INTEGER NOT NULL DEFAULT 0',
      ),
      addColumn('auth_logs', 'last_sync_attempt_at', 'TEXT'),
      addColumn('auth_logs', 'last_sync_error', 'TEXT'),
      addColumn('auth_logs', 'next_sync_attempt_at', 'TEXT'),
      `CREATE INDEX IF NOT EXISTS idx_auth_logs_retry_status_next_attempt
        ON auth_logs (sync_status, next_sync_attempt_at, created_at)`,
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

  await repairBrokenMigrationState(database);

  const appliedMigrationIds = await getAppliedMigrationIds(database);
  const pendingMigrations = MIGRATIONS.filter(
    migration => !appliedMigrationIds.has(migration.id),
  );

  for (const migration of pendingMigrations) {
    for (const statement of migration.statements) {
      await executeMigrationStep(database, statement);
    }

    await database.execute(
      `INSERT INTO schema_migrations (id, name, applied_at)
        VALUES (?, ?, ?)`,
      [migration.id, migration.name, new Date().toISOString()],
    );
  }

  await ensureAdditiveMigrationColumns(database);
}

function addColumn(
  tableName: string,
  columnName: string,
  definition: string,
): AddColumnMigrationStep {
  return {
    type: 'add_column',
    tableName,
    columnName,
    definition,
  };
}

async function executeMigrationStep(
  database: LocalDatabase,
  step: MigrationStep,
): Promise<void> {
  if (typeof step === 'string') {
    await database.execute(step);
    return;
  }

  await executeAddColumnStep(database, step);
}

async function executeAddColumnStep(
  database: LocalDatabase,
  step: AddColumnMigrationStep,
): Promise<void> {
  assertSqlIdentifier(step.tableName);
  assertSqlIdentifier(step.columnName);

  if (await columnExists(database, step.tableName, step.columnName)) {
    return;
  }

  await database.execute(
    `ALTER TABLE ${step.tableName} ADD COLUMN ${step.columnName} ${step.definition}`,
  );
}

async function ensureAdditiveMigrationColumns(
  database: LocalDatabase,
): Promise<void> {
  for (const migration of MIGRATIONS) {
    for (const step of migration.statements) {
      if (typeof step !== 'string' && step.type === 'add_column') {
        await executeAddColumnStep(database, step);
      }
    }
  }
}

async function columnExists(
  database: LocalDatabase,
  tableName: string,
  columnName: string,
): Promise<boolean> {
  const result = await database.execute(`PRAGMA table_info(${tableName})`);
  return result.rows.some(row => getColumnName(row) === columnName);
}

function getColumnName(row: DatabaseRow): string | undefined {
  return typeof row.name === 'string' ? row.name : undefined;
}

function assertSqlIdentifier(identifier: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid migration SQL identifier: ${identifier}`);
  }
}

async function repairBrokenMigrationState(
  database: LocalDatabase,
): Promise<void> {
  const tables = await database.execute(
    `SELECT name FROM sqlite_master WHERE type='table'`,
  );
  const tableNames = new Set(
    tables.rows.map(row => row.name).filter((name): name is string => !!name),
  );

  const requiredTables = ['auth_logs', 'employee_face_templates', 'users'];
  const missingRequired = requiredTables.some(name => !tableNames.has(name));

  if (missingRequired && tableNames.has('schema_migrations')) {
    await database.execute('DELETE FROM schema_migrations');
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
