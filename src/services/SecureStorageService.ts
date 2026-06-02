import type {EmployeeFaceTemplate} from '../types/FaceTypes';
import {faceTemplateRepository} from './database/repositories/faceTemplateRepository';

export class SecureStorageService {
  async saveFaceTemplate(template: EmployeeFaceTemplate): Promise<void> {
    await faceTemplateRepository.save(template);
  }

  async getFaceTemplate(
    employeeId: string,
  ): Promise<EmployeeFaceTemplate | null> {
    return faceTemplateRepository.findByEmployeeId(employeeId);
  }
}

export const secureStorageService = new SecureStorageService();
