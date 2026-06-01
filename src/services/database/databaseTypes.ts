import type {Scalar} from '@op-engineering/op-sqlite';

export type DatabaseValue = Scalar;
export type DatabaseParams = DatabaseValue[];
export type DatabaseRow = Record<string, DatabaseValue>;

export type DatabaseResult = {
  insertId?: number;
  rowsAffected: number;
  rows: DatabaseRow[];
};

export type DatabaseTransaction = {
  execute(sql: string, params?: DatabaseParams): Promise<DatabaseResult>;
};

export type LocalDatabase = {
  execute(sql: string, params?: DatabaseParams): Promise<DatabaseResult>;
  transaction<T>(
    callback: (transaction: DatabaseTransaction) => Promise<T>,
  ): Promise<T>;
  close(): Promise<void>;
};

export type Migration = {
  id: number;
  name: string;
  statements: string[];
};
