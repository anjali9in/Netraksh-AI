import {livenessService} from '../src/services/liveness/livenessService';
import {
  buildChallengeRows,
  detectChallengePulse,
  getLiveChallengeHint,
} from '../src/services/liveness/livenessChallengeFeedback';

describe('livenessChallengeFeedback', () => {
  it('announces blink detection when count increases', () => {
    livenessService.resetSession(['BLINK']);
    const before = livenessService.getSessionState();
    livenessService.processFrame(0.15, 0.18, 1.0);
    const afterBlink = livenessService.processFrame(0.35, 0.18, 1.0);

    const pulse = detectChallengePulse(before, afterBlink);
    expect(pulse).toBe('Blink detected (1/2)');
  });

  it('announces when a challenge is passed', () => {
    livenessService.resetSession(['SMILE']);
    const before = livenessService.getSessionState();
    livenessService.processFrame(0.35, 0.6, 1.0);
    livenessService.processFrame(0.35, 0.6, 1.0);
    const passed = livenessService.processFrame(0.35, 0.6, 1.0);

    const pulse = detectChallengePulse(before, passed);
    expect(pulse).toBe('Smile detected!');
  });

  it('builds passed rows with detection labels', () => {
    livenessService.resetSession(['HEAD_TURN']);
    livenessService.processFrame(0.35, 0.2, 0.4);
    livenessService.processFrame(0.35, 0.2, 0.4);
    const done = livenessService.processFrame(0.35, 0.2, 0.4);

    const rows = buildChallengeRows(done);
    expect(rows[0].status).toBe('passed');
    expect(rows[0].detail).toBe('Head movement detected');
  });

  it('returns live head-turn hint when yaw exceeds threshold', () => {
    const state = livenessService.resetSession(['HEAD_TURN']);
    const hint = getLiveChallengeHint(state, {ear: 0.3, mar: 0.2, yawRatio: 0.5});
    expect(hint?.toLowerCase()).toContain('head turn detected');
  });
});
