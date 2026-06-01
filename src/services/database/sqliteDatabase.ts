import {openAsync} from '@op-engineering/op-sqlite';
import type {DB, QueryResult, Scalar} from '@op-engineering/op-sqlite';

import type {DatabaseConfig} from '../../config/databaseConfig';
import type {
  DatabaseParams,
  DatabaseResult,
  DatabaseTransaction,
  LocalDatabase,
} from './databaseTypes';

export class SqliteDatabase implements LocalDatabase {
  private connection: DB | null = null;

  constructor(private readonly config: DatabaseConfig) {}

  async execute(
    sql: string,
    params: DatabaseParams = [],
  ): Promise<DatabaseResult> {
    const db = await this.getConnection();
    const result = await db.execute(sql, params);
    return mapQueryResult(result);
  }

  async transaction<T>(
    callback: (transaction: DatabaseTransaction) => Promise<T>,
  ): Promise<T> {
    const db = await this.getConnection();
    let transactionResult: T | undefined;

    await db.transaction(async nativeTransaction => {
      transactionResult = await callback({
        execute: async (sql: string, params: DatabaseParams = []) => {
          const result = await nativeTransaction.execute(sql, params);
          return mapQueryResult(result);
        },
      });
    });

    return transactionResult as T;
  }

  async close(): Promise<void> {
    if (!this.connection) {
      return;
    }

    await this.connection.closeAsync();
    this.connection = null;
  }

  private async getConnection(): Promise<DB> {
    if (this.connection) {
      return this.connection;
    }

    this.connection = await openAsync({
      name: this.config.name,
      location: this.config.location,
    });

    await this.connection.execute('PRAGMA foreign_keys = ON');
    await this.connection.execute('PRAGMA journal_mode = WAL');

    return this.connection;
  }
}

function mapQueryResult(result: QueryResult): DatabaseResult {
  return {
    insertId: result.insertId,
    rowsAffected: result.rowsAffected,
    rows: result.rows as Record<string, Scalar>[],
  };
}
