import SQLite from 'react-native-sqlite-storage';
import type {SQLiteDatabase, Transaction, ResultSet} from 'react-native-sqlite-storage';

import type {DatabaseConfig} from '../../config/databaseConfig';
import type {
  DatabaseParams,
  DatabaseResult,
  DatabaseRow,
  DatabaseTransaction,
  LocalDatabase,
} from './databaseTypes';

SQLite.enablePromise(true);

export class SqliteDatabase implements LocalDatabase {
  private connection: SQLiteDatabase | null = null;

  constructor(private readonly config: DatabaseConfig) {}

  async execute(
    sql: string,
    params: DatabaseParams = [],
  ): Promise<DatabaseResult> {
    const db = await this.getConnection();
    const [result] = await db.executeSql(sql, params as unknown[]);
    return mapResultSet(result);
  }

  async transaction<T>(
    callback: (transaction: DatabaseTransaction) => Promise<T>,
  ): Promise<T> {
    const db = await this.getConnection();
    let transactionResult: T | undefined;

    await db.transaction(async (tx: Transaction) => {
      transactionResult = await callback({
        execute: async (sql: string, params: DatabaseParams = []) => {
          const [, result] = await tx.executeSql(sql, params as unknown[]);
          return mapResultSet(result);
        },
      });
    });

    return transactionResult as T;
  }

  async close(): Promise<void> {
    if (!this.connection) {
      return;
    }

    await this.connection.close();
    this.connection = null;
  }

  private async getConnection(): Promise<SQLiteDatabase> {
    if (this.connection) {
      return this.connection;
    }

    this.connection = await SQLite.openDatabase({
      name: this.config.name,
      location: (this.config.location as 'default' | 'Library' | 'Documents') ?? 'default',
    });

    await this.connection.executeSql('PRAGMA foreign_keys = ON');
    await this.connection.executeSql('PRAGMA journal_mode = WAL');

    return this.connection;
  }
}

function mapResultSet(result: ResultSet): DatabaseResult {
  const rows: DatabaseRow[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    rows.push(result.rows.item(i) as DatabaseRow);
  }
  return {
    insertId: result.insertId,
    rowsAffected: result.rowsAffected,
    rows,
  };
}
