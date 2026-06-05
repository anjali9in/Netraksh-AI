import {parseSyncAuthLogsRequest} from '../backend/src/validation';

const validLog = {
  id: 1,
  employeeId: 'EMP001',
  authStatus: 'SUCCESS',
  similarityScore: 0.91,
  livenessStatus: 'PASSED',
  challengeType: 'BLINK',
  deviceId: 'device-001',
  modelVersion: 'MobileFaceNet',
  createdAt: '2026-06-05T00:00:00.000Z',
  logHash: 'a'.repeat(64),
  latitude: 28.6139,
  longitude: 77.209,
  locationAccuracy: 12,
  ipAddress: '192.0.2.10',
  locationCapturedAt: '2026-06-05T00:00:01.000Z',
};

describe('backend sync auth log validation', () => {
  it('accepts a well-formed auth log payload', () => {
    const parsed = parseSyncAuthLogsRequest(
      JSON.stringify({logs: [validLog]}),
    );

    expect(parsed.logs[0]).toMatchObject({
      employeeId: 'EMP001',
      deviceId: 'device-001',
      syncStatus: 'PENDING',
    });
  });

  it('rejects impossible location coordinates', () => {
    expect(() =>
      parseSyncAuthLogsRequest(
        JSON.stringify({logs: [{...validLog, latitude: 91}]}),
      ),
    ).toThrow('latitude is out of range');
  });

  it('rejects malformed timestamps', () => {
    expect(() =>
      parseSyncAuthLogsRequest(
        JSON.stringify({logs: [{...validLog, createdAt: 'not-a-date'}]}),
      ),
    ).toThrow('createdAt must be a valid ISO timestamp');
  });

  it('rejects similarity scores outside the model range', () => {
    expect(() =>
      parseSyncAuthLogsRequest(
        JSON.stringify({logs: [{...validLog, similarityScore: 1.2}]}),
      ),
    ).toThrow('similarityScore must be a number between 0 and 1');
  });

  it('rejects malformed log hashes', () => {
    expect(() =>
      parseSyncAuthLogsRequest(
        JSON.stringify({logs: [{...validLog, logHash: 'not-a-hash'}]}),
      ),
    ).toThrow('logHash must be a SHA-256 hex digest');
  });
});
