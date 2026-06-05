import {
  ENROLLMENT_CHALLENGE_ORDER,
  LivenessService,
} from '../src/services/liveness/livenessService';
import {
  FACE_RECOGNITION_MODEL,
  TOTAL_AI_MODEL_BUDGET_MB,
} from '../src/ai/modelConfig';
import {FACE_MATCH_THRESHOLD} from '../src/config/thresholds';

describe('offline lightweight model stack', () => {
  it('uses MobileFaceNet-size recognition settings', () => {
    expect(FACE_RECOGNITION_MODEL.modelName).toBe('MobileFaceNet');
    expect(FACE_RECOGNITION_MODEL.modelFormat).toBe('tflite');
    expect(FACE_RECOGNITION_MODEL.inputWidth).toBe(112);
    expect(FACE_RECOGNITION_MODEL.inputHeight).toBe(112);
    expect(FACE_RECOGNITION_MODEL.embeddingDimension).toBe(128);
    expect(FACE_RECOGNITION_MODEL.threshold).toBe(FACE_MATCH_THRESHOLD);
    expect(TOTAL_AI_MODEL_BUDGET_MB).toBeLessThanOrEqual(20);
  });

  it('defaults active liveness to blink and head movement', () => {
    const service = new LivenessService();
    const state = service.resetSession();

    expect(state.challenges.map(challenge => challenge.type).sort()).toEqual([
      'BLINK',
      'HEAD_TURN',
    ]);
    expect(ENROLLMENT_CHALLENGE_ORDER).toEqual(['HEAD_TURN', 'BLINK']);
  });
});
