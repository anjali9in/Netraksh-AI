import fs from 'fs';
import path from 'path';

describe('LiveScannerPanel liveness source', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../src/components/LiveScannerPanel.tsx'),
    'utf8',
  );

  it('does not advance authentication liveness from simulated metrics', () => {
    expect(source).not.toContain('getSimulatedMetrics');
    expect(source).not.toContain('livenessService.getSimulatedMetrics');
    expect(source).toContain('extractLivenessMetrics(face)');
    expect(source).toContain('livenessService.processFrame(');
  });

  it('does not keep a legacy liveness simulation interval', () => {
    expect(source).not.toContain('timerRef');
    expect(source).toContain('Face alignment timed out');
  });

  it('falls back to smile challenge when blink signals are unavailable in enrollment', () => {
    expect(source).toContain('EYE_SIGNAL_MISSING_FRAME_LIMIT');
    expect(source).toContain("['HEAD_TURN', 'SMILE']");
    expect(source).toContain('Blink signal unavailable. Switched to smile challenge.');
  });
});
