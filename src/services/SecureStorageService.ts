import {
  registerEmployeeFace,
  verifyEmployeeFace,
  identifyEmployeeFace,
  MatchResult
} from '../ai/faceMatcher';

export class SecureStorageService {
  /**
   * Registers a new employee face template into the local secure SQLite table.
   * Generates face embeddings offline and stores them securely.
   */
  public async registerFace(
    employeeId: string,
    imagePath: string,
    deviceId: string = 'unknown-device'
  ): Promise<boolean> {
    console.log(`[SecureStorageService] Registering template for employee: ${employeeId}`);
    return registerEmployeeFace(employeeId, imagePath, deviceId);
  }

  /**
   * Verifies if a captured photo matches the stored template for a specific employee ID.
   */
  public async verifyFace(
    employeeId: string,
    imagePath: string,
    customThreshold?: number
  ): Promise<MatchResult> {
    console.log(`[SecureStorageService] Verifying face against employee: ${employeeId}`);
    return verifyEmployeeFace(employeeId, imagePath, customThreshold);
  }

  /**
   * Identifies an employee by scanning their face against all local templates.
   */
  public async identifyFace(
    imagePath: string,
    customThreshold?: number
  ): Promise<MatchResult> {
    console.log('[SecureStorageService] Identifying face against all stored templates');
    return identifyEmployeeFace(imagePath, customThreshold);
  }
}

export const secureStorageService = new SecureStorageService();
