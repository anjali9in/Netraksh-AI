export type EmployeeFaceTemplate = {
  employeeId: string;
  encryptedEmbedding: string;
  modelVersion: string;
  deviceId: string;
  createdAt: string;
  updatedAt: string;
  templateEncryptionVersion?: string | null;
  migratedFromEncryptionVersion?: string | null;
  migratedAt?: string | null;
};

export type FaceDetectionResult = {
  detected: boolean;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};
