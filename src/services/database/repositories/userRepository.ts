import type {User} from '../../../types/UserTypes';
import type {DatabaseRow} from '../databaseTypes';
import {getLocalDatabase} from '../localDatabase';

export class UserRepository {
  async save(user: User): Promise<void> {
    const database = await getLocalDatabase();

    await database.execute(
      `INSERT INTO users (
        employee_id,
        full_name,
        department,
        designation,
        site_id,
        phone,
        email,
        status,
        created_at,
        updated_at,
        sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(employee_id) DO UPDATE SET
        full_name = excluded.full_name,
        department = excluded.department,
        designation = excluded.designation,
        site_id = excluded.site_id,
        phone = excluded.phone,
        email = excluded.email,
        status = excluded.status,
        updated_at = excluded.updated_at,
        sync_status = excluded.sync_status`,
      [
        user.employeeId,
        user.fullName,
        user.department ?? null,
        user.designation ?? null,
        user.siteId ?? null,
        user.phone ?? null,
        user.email ?? null,
        user.status,
        user.createdAt,
        user.updatedAt,
        user.syncStatus,
      ],
    );
  }

  async findByEmployeeId(employeeId: string): Promise<User | null> {
    const database = await getLocalDatabase();
    const result = await database.execute(
      `SELECT *
        FROM users
        WHERE employee_id = ?
        LIMIT 1`,
      [employeeId],
    );

    const row = result.rows[0];
    return row ? mapUserRow(row) : null;
  }

  async getAll(): Promise<User[]> {
    const database = await getLocalDatabase();
    const result = await database.execute(
      `SELECT *
        FROM users
        ORDER BY updated_at DESC`,
    );

    return result.rows.map(mapUserRow);
  }

  async getPendingSync(): Promise<User[]> {
    const database = await getLocalDatabase();
    const result = await database.execute(
      `SELECT *
        FROM users
        WHERE sync_status = ?
        ORDER BY updated_at ASC`,
      ['PENDING'],
    );

    return result.rows.map(mapUserRow);
  }

  async updateSyncStatus(
    employeeId: string,
    syncStatus: User['syncStatus'],
  ): Promise<void> {
    const database = await getLocalDatabase();

    await database.execute(
      `UPDATE users
        SET sync_status = ?, updated_at = ?
        WHERE employee_id = ?`,
      [syncStatus, new Date().toISOString(), employeeId],
    );
  }
}

function mapUserRow(row: DatabaseRow): User {
  return {
    employeeId: String(row.employee_id),
    fullName: String(row.full_name),
    department: toOptionalString(row.department),
    designation: toOptionalString(row.designation),
    siteId: toOptionalString(row.site_id),
    phone: toOptionalString(row.phone),
    email: toOptionalString(row.email),
    status: row.status as User['status'],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    syncStatus: row.sync_status as User['syncStatus'],
  };
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export const userRepository = new UserRepository();
