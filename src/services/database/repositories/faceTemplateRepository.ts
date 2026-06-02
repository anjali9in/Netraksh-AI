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
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(employee_id) DO UPDATE SET
        encrypted_embedding = excluded.encrypted_embedding,
        model_version = excluded.model_version,
        device_id = excluded.device_id,
        updated_at = excluded.updated_at`,
      [
        template.employeeId,
        template.encryptedEmbedding,
        template.modelVersion,
        template.deviceId,
        template.createdAt,
        template.updatedAt,
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
  };
}

export const faceTemplateRepository = new FaceTemplateRepository();
