// @ts-nocheck
import {jest} from '@jest/globals';

export {};

// ============================================================================
// STATEFUL IN-MEMORY SQLITE MOCK
// ============================================================================
const mockDbState = {
  templates: [] as any[],
  logs: [] as any[],
  migrations: [] as any[],
};

// Reset state helper for tests
(global as any).resetMockDatabase = () => {
  mockDbState.templates = [];
  mockDbState.logs = [];
  mockDbState.migrations = [];
};
(global as any).mockDbState = mockDbState;

const mockExecute = async (sql: string, params: any[] = []) => {
  const normalizedSql = sql.trim().replace(/\s+/g, ' ');

  // schema_migrations check
  if (normalizedSql.includes('SELECT id FROM schema_migrations')) {
    return {
      insertId: undefined,
      rowsAffected: 0,
      rows: mockDbState.migrations,
    };
  }

  if (normalizedSql.includes('INSERT INTO schema_migrations')) {
    mockDbState.migrations.push({
      id: params[0],
      name: params[1],
      applied_at: params[2],
    });
    return {
      insertId: params[0],
      rowsAffected: 1,
      rows: [],
    };
  }

  // employee_face_templates
  if (
    normalizedSql.includes('INSERT OR REPLACE INTO employee_face_templates')
  ) {
    const employeeId = params[0];
    const index = mockDbState.templates.findIndex(
      t => t.employee_id === employeeId,
    );
    const newTemplate = {
      employee_id: params[0],
      encrypted_embedding: params[1],
      model_version: params[2],
      device_id: params[3],
      created_at: params[4],
      updated_at: params[5],
    };
    if (index >= 0) {
      mockDbState.templates[index] = newTemplate;
    } else {
      mockDbState.templates.push(newTemplate);
    }
    return {
      insertId: undefined,
      rowsAffected: 1,
      rows: [],
    };
  }

  if (
    normalizedSql.includes(
      'SELECT encrypted_embedding, model_version FROM employee_face_templates WHERE employee_id = ?',
    )
  ) {
    const employeeId = params[0];
    const filtered = mockDbState.templates.filter(
      t => t.employee_id === employeeId,
    );
    return {
      insertId: undefined,
      rowsAffected: 0,
      rows: filtered,
    };
  }

  if (
    normalizedSql.includes(
      'SELECT employee_id, encrypted_embedding, model_version FROM employee_face_templates',
    )
  ) {
    return {
      insertId: undefined,
      rowsAffected: 0,
      rows: [...mockDbState.templates],
    };
  }

  // auth_logs
  if (normalizedSql.includes('INSERT INTO auth_logs')) {
    const nextId = mockDbState.logs.length + 1;
    const newLog = {
      id: nextId,
      employee_id: params[0],
      auth_status: params[1],
      failure_reason: params[2],
      similarity_score: params[3],
      liveness_status: params[4],
      challenge_type: params[5],
      device_id: params[6],
      model_version: params[7],
      created_at: params[8],
      sync_status: params[9],
      log_hash: params[10],
    };
    mockDbState.logs.push(newLog);
    return {
      insertId: nextId,
      rowsAffected: 1,
      rows: [],
    };
  }

  if (
    normalizedSql.includes(
      "SELECT * FROM auth_logs WHERE sync_status = 'PENDING'",
    )
  ) {
    const filtered = mockDbState.logs.filter(l => l.sync_status === 'PENDING');
    return {
      insertId: undefined,
      rowsAffected: 0,
      rows: filtered,
    };
  }

  if (normalizedSql.includes('SELECT * FROM auth_logs WHERE id = ?')) {
    const id = params[0];
    const filtered = mockDbState.logs.filter(l => l.id === id);
    return {
      insertId: undefined,
      rowsAffected: 0,
      rows: filtered,
    };
  }

  if (
    normalizedSql.includes(
      "UPDATE auth_logs SET sync_status = 'SYNCED', log_hash = ? WHERE id = ?",
    )
  ) {
    const hash = params[0];
    const id = params[1];
    const log = mockDbState.logs.find(l => l.id === id);
    if (log) {
      log.sync_status = 'SYNCED';
      log.log_hash = hash;
    }
    return {
      insertId: undefined,
      rowsAffected: 1,
      rows: [],
    };
  }

  if (
    normalizedSql.includes('SELECT * FROM auth_logs ORDER BY created_at DESC')
  ) {
    const sorted = [...mockDbState.logs].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return {
      insertId: undefined,
      rowsAffected: 0,
      rows: sorted,
    };
  }

  if (
    normalizedSql.includes(
      "DELETE FROM auth_logs WHERE sync_status = 'SYNCED' AND created_at < ?",
    )
  ) {
    const cutoff = new Date(params[0]).getTime();
    const initialLen = mockDbState.logs.length;
    mockDbState.logs = mockDbState.logs.filter(
      l =>
        !(
          l.sync_status === 'SYNCED' &&
          new Date(l.created_at).getTime() < cutoff
        ),
    );
    const deletedCount = initialLen - mockDbState.logs.length;
    return {
      insertId: undefined,
      rowsAffected: deletedCount,
      rows: [],
    };
  }

  // Fallback for CREATE TABLE, CREATE INDEX, PRAGMA, etc.
  return {
    insertId: undefined,
    rowsAffected: 0,
    rows: [],
  };
};

const toResultSet = (result: any) => ({
  insertId: result.insertId,
  rowsAffected: result.rowsAffected,
  rows: {
    length: result.rows.length,
    item: (index: number) => result.rows[index],
    raw: () => result.rows,
  },
});

jest.mock(
  'react-native-sqlite-storage',
  () => {
    const sqlite = {
      enablePromise: jest.fn(),
      openDatabase: jest.fn().mockImplementation(async () => {
        return {
          executeSql: jest
            .fn()
            .mockImplementation(async (sql: string, params: any[] = []) => {
              const result = await mockExecute(sql, params);
              return [toResultSet(result)];
            }),
          transaction: jest.fn().mockImplementation(async (callback: any) => {
            return callback({
              executeSql: jest
                .fn()
                .mockImplementation(async (sql: string, params: any[] = []) => {
                  const result = await mockExecute(sql, params);
                  return [undefined, toResultSet(result)];
                }),
            });
          }),
          close: jest.fn().mockResolvedValue(undefined),
        };
      }),
    };

    return {
      __esModule: true,
      default: sqlite,
      ...sqlite,
    };
  },
  {virtual: true},
);

jest.mock(
  '@op-engineering/op-sqlite',
  () => {
    return {
      openAsync: jest.fn().mockImplementation(async () => {
        return {
          execute: jest
            .fn()
            .mockImplementation(async (sql: string, params: any[] = []) => {
              const result = await mockExecute(sql, params);
              return {
                insertId: result.insertId,
                rowsAffected: result.rowsAffected,
                rows: result.rows,
              };
            }),
          transaction: jest.fn().mockImplementation(async (callback: any) => {
            return callback({
              execute: jest
                .fn()
                .mockImplementation(async (sql: string, params: any[] = []) => {
                  const result = await mockExecute(sql, params);
                  return {
                    insertId: result.insertId,
                    rowsAffected: result.rowsAffected,
                    rows: result.rows,
                  };
                }),
            });
          }),
          closeAsync: jest.fn().mockResolvedValue(undefined),
        };
      }),
    };
  },
  {virtual: true},
);

// ============================================================================
// OTHER NATIVE MODULE MOCKS
// ============================================================================
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn().mockResolvedValue(true),
  getGenericPassword: jest
    .fn()
    .mockResolvedValue({username: 'token', password: 'mock-passcode'}),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
}));

jest.mock('react-native-vision-camera', () => {
  return {
    Camera: jest.fn().mockImplementation(() => null),
    useCameraDevice: jest
      .fn()
      .mockReturnValue({id: 'front-camera', name: 'Front Camera'}),
    useCameraPermission: jest.fn().mockReturnValue({
      hasPermission: true,
      requestPermission: jest.fn().mockResolvedValue(true),
      canRequestPermission: true,
      status: 'granted',
    }),
    usePhotoOutput: jest.fn().mockReturnValue({
      capturePhotoToFile: jest
        .fn()
        .mockResolvedValue({filePath: 'mock/path/photo.jpg'}),
    }),
  };
});

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
  }),
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native') as any;
  RN.Linking = {
    openSettings: jest.fn().mockResolvedValue(true),
    canOpenURL: jest.fn().mockResolvedValue(true),
    openURL: jest.fn().mockResolvedValue(true),
  };
  return RN;
});

// ============================================================================
// AI MODEL & IMAGE PROCESSING MOCKS
// ============================================================================
jest.mock('react-native-fast-tflite', () => {
  return {
    loadTensorflowModel: jest.fn().mockImplementation(async () => {
      return {
        run: jest.fn().mockImplementation(async (inputs: any[]) => {
          const inputBuffer = inputs[0];
          const inputView = new Float32Array(inputBuffer);

          // Generate a sum hash based on input buffer values (first 100 values to avoid overflow/NaN)
          let sum = 0;
          const len = Math.min(inputView.length, 100);
          for (let i = 0; i < len; i++) {
            if (!isNaN(inputView[i])) {
              sum += inputView[i] * (i + 1);
            }
          }

          // Return a mock output array buffer of size 512 floats
          const buffer = new ArrayBuffer(512 * 4);
          const view = new Float32Array(buffer);

          let sumSq = 0;
          for (let i = 0; i < 512; i++) {
            const val = Math.sin(sum + i) * Math.cos(sum * i);
            view[i] = val;
            sumSq += val * val;
          }

          const norm = Math.sqrt(sumSq);
          for (let i = 0; i < 512; i++) {
            view[i] = norm === 0 ? 0 : view[i] / norm;
          }
          return [view];
        }),
      };
    }),
  };
});

jest.mock('react-native-nitro-image', () => {
  return {
    loadImage: jest.fn().mockImplementation(async (source: any) => {
      const filePath = source?.filePath || '';
      return {
        resizeAsync: jest.fn().mockImplementation(async () => {
          return {
            toRawPixelDataAsync: jest.fn().mockImplementation(async () => {
              // Return dummy 112x112 RGBA pixel buffer filled dynamically with filePath characters
              const buffer = new ArrayBuffer(112 * 112 * 4);
              const view = new Uint8Array(buffer);
              for (let i = 0; i < view.length; i++) {
                const charIndex =
                  (Math.floor(i / 4) + (i % 4)) % filePath.length;
                view[i] = (i + filePath.charCodeAt(charIndex || 0)) % 256;
              }
              return {
                buffer,
                width: 112,
                height: 112,
                pixelFormat: 'RGBA',
              };
            }),
          };
        }),
      };
    }),
  };
});
