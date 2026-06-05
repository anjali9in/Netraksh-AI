import CryptoJS from 'crypto-js';

const fixedKeyHex =
  '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';

function installCryptoMocks(): void {
  let nextByte = 1;
  Object.defineProperty(global, 'crypto', {
    configurable: true,
    value: {
      getRandomValues: jest.fn((array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = nextByte % 256;
          nextByte++;
        }
        return array;
      }),
    },
  });

  const Keychain = require('react-native-keychain');
  Keychain.getGenericPassword.mockResolvedValue({
    username: 'biometric',
    password: fixedKeyHex,
  });
  Keychain.setGenericPassword.mockResolvedValue(true);
}

function legacyEncryptEmbedding(embedding: number[]): string {
  const ivHex = '101112131415161718191a1b1c1d1e1f';
  const encrypted = CryptoJS.AES.encrypt(
    JSON.stringify(embedding),
    CryptoJS.enc.Hex.parse(fixedKeyHex),
    {
      iv: CryptoJS.enc.Hex.parse(ivHex),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    },
  );

  return `${ivHex}:${encrypted.ciphertext.toString(CryptoJS.enc.Hex)}`;
}

async function seedLegacyTemplate(
  employeeId: string,
  imagePath: string,
): Promise<string> {
  const {faceEmbeddingGenerator} = require('../src/ai/faceEmbedding');
  const embedding = await faceEmbeddingGenerator.generateEmbedding(imagePath);
  const legacyCiphertext = legacyEncryptEmbedding(embedding);
  const now = '2026-06-05T00:00:00.000Z';

  (global as any).mockDbState.templates.push({
    employee_id: employeeId,
    encrypted_embedding: legacyCiphertext,
    model_version: 'MobileFaceNet',
    device_id: 'device-a',
    created_at: now,
    updated_at: now,
    template_encryption_version: null,
    migrated_from_encryption_version: null,
    migrated_at: null,
  });

  return legacyCiphertext;
}

describe('legacy biometric template migration policy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    if (typeof (global as any).resetMockDatabase === 'function') {
      (global as any).resetMockDatabase();
    }
    installCryptoMocks();
  });

  it('rewrites a legacy AES-CBC template to v2 only after a successful verification', async () => {
    const imagePath = 'file:///employee-001.jpg';
    const legacyCiphertext = await seedLegacyTemplate('EMP001', imagePath);
    const {verifyEmployeeFace} = require('../src/ai/faceMatcher');

    const result = await verifyEmployeeFace('EMP001', imagePath, 0.75);
    const template = (global as any).mockDbState.templates[0];

    expect(result.success).toBe(true);
    expect(result.templateMigration).toMatchObject({
      performed: true,
      fromVersion: 'legacy-aes-cbc',
      toVersion: 'v2',
    });
    expect(template.encrypted_embedding).not.toBe(legacyCiphertext);
    expect(template.encrypted_embedding).toMatch(
      /^v2:[0-9a-f]{32}:[0-9a-f]+:[0-9a-f]{64}$/,
    );
    expect(template.template_encryption_version).toBe('v2');
    expect(template.migrated_from_encryption_version).toBe('legacy-aes-cbc');
    expect(template.migrated_at).toEqual(result.templateMigration?.migratedAt);
  });

  it('does not migrate a legacy AES-CBC template when verification fails', async () => {
    const imagePath = 'file:///employee-002.jpg';
    const legacyCiphertext = await seedLegacyTemplate('EMP002', imagePath);
    const {verifyEmployeeFace} = require('../src/ai/faceMatcher');

    const result = await verifyEmployeeFace('EMP002', 'file:///other.jpg', 1.01);
    const template = (global as any).mockDbState.templates[0];

    expect(result.success).toBe(false);
    expect(result.templateMigration).toBeUndefined();
    expect(template.encrypted_embedding).toBe(legacyCiphertext);
    expect(template.template_encryption_version).toBeNull();
    expect(template.migrated_at).toBeNull();
  });

  it('requires controlled re-enrollment for unknown legacy template formats', async () => {
    const {faceEmbeddingGenerator} = require('../src/ai/faceEmbedding');
    const imagePath = 'file:///employee-003.jpg';
    const embedding = await faceEmbeddingGenerator.generateEmbedding(imagePath);

    (global as any).mockDbState.templates.push({
      employee_id: 'EMP003',
      encrypted_embedding: JSON.stringify(embedding),
      model_version: 'MobileFaceNet',
      device_id: 'device-a',
      created_at: '2026-06-05T00:00:00.000Z',
      updated_at: '2026-06-05T00:00:00.000Z',
      template_encryption_version: null,
      migrated_from_encryption_version: null,
      migrated_at: null,
    });

    const {verifyEmployeeFace} = require('../src/ai/faceMatcher');
    const result = await verifyEmployeeFace('EMP003', imagePath, 0.75);
    const template = (global as any).mockDbState.templates[0];

    expect(result.success).toBe(true);
    expect(result.templateMigration).toEqual({
      performed: false,
      fromVersion: 'legacy-unknown',
      requiresReEnrollment: true,
    });
    expect(template.template_encryption_version).toBeNull();
    expect(template.migrated_at).toBeNull();
  });
});
