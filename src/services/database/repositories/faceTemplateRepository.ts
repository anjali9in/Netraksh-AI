import type {EmployeeFaceTemplate} from '../../../types/FaceTypes';
import type {DatabaseRow} from '../databaseTypes';
import {getLocalDatabase} from '../localDatabase';

export class FaceTemplateRepository {
  async save(template: EmployeeFaceTemplate): Promise<void> {
    const database = await getLocalDatabase();

    await database.execute(
      `INSERT INTO employee_face_templates (
        employee_id,
        encrypted_embedding,
        model_version,
        device_id,
        created_at,
        updated_at,
        template_encryption_version,
        migrated_from_encryption_version,
        migrated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(employee_id) DO UPDATE SET
        encrypted_embedding = excluded.encrypted_embedding,
        model_version = excluded.model_version,
        device_id = excluded.device_id,
        updated_at = excluded.updated_at,
        template_encryption_version = excluded.template_encryption_version,
        migrated_from_encryption_version = excluded.migrated_from_encryption_version,
        migrated_at = excluded.migrated_at`,
      [
        template.employeeId,
        template.encryptedEmbedding,
        template.modelVersion,
        template.deviceId,
        template.createdAt,
        template.updatedAt,
        template.templateEncryptionVersion ?? null,
        template.migratedFromEncryptionVersion ?? null,
        template.migratedAt ?? null,
      ],
    );
  }

  async findByEmployeeId(
    employeeId: string,
  ): Promise<EmployeeFaceTemplate | null> {
    const database = await getLocalDatabase();
    const result = await database.execute(
      `SELECT *
        FROM employee_face_templates
        WHERE employee_id = ?
        LIMIT 1`,
      [employeeId],
    );

    const row = result.rows[0];
    return row ? mapTemplateRow(row) : null;
  }
}

function mapTemplateRow(row: DatabaseRow): EmployeeFaceTemplate {
  return {
    employeeId: String(row.employee_id),
    encryptedEmbedding: String(row.encrypted_embedding),
    modelVersion: String(row.model_version),
    deviceId: String(row.device_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    templateEncryptionVersion: toNullableString(row.template_encryption_version),
    migratedFromEncryptionVersion: toNullableString(
      row.migrated_from_encryption_version,
    ),
    migratedAt: toNullableString(row.migrated_at),
  };
}

function toNullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

export const faceTemplateRepository = new FaceTemplateRepository();
