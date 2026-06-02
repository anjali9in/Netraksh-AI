import { LivenessService, Landmark } from '../src/services/liveness/livenessService';

describe('Liveness Service Unit Tests', () => {
  let service: LivenessService;

  beforeEach(() => {
    service = new LivenessService();
  });

  describe('EAR Calculation (Eye Aspect Ratio)', () => {
    it('should calculate correct EAR for a standard layout', () => {
      // Coordinates of a standard eye shape: (p1, p2, p3, p4, p5, p6)
      // p1 & p4 are corners. p2, p3, p5, p6 are top/bottom vertical boundaries.
      const eyeLandmarks: Landmark[] = [
        { x: 0.0, y: 0.0 }, // p1 (left corner)
        { x: 1.0, y: 0.5 }, // p2 (top-left)
        { x: 2.0, y: 0.5 }, // p3 (top-right)
        { x: 3.0, y: 0.0 }, // p4 (right corner)
        { x: 2.0, y: -0.5 }, // p5 (bottom-right)
        { x: 1.0, y: -0.5 }, // p6 (bottom-left)
      ];

      const ear = service.calculateEAR(eyeLandmarks);
      // distVertical1 = sqrt((1-1)^2 + (0.5 - -0.5)^2) = 1.0
      // distVertical2 = sqrt((2-2)^2 + (0.5 - -0.5)^2) = 1.0
      // distHorizontal = sqrt((3-0)^2 + (0-0)^2) = 3.0
      // EAR = (1.0 + 1.0) / (2.0 * 3.0) = 2.0 / 6.0 = 0.33333333333
      expect(ear).toBeCloseTo(0.3333, 4);
    });

    it('should return 1.0 if not enough landmarks are provided', () => {
      expect(service.calculateEAR([])).toBe(1.0);
    });
  });

  describe('MAR Calculation (Mouth Aspect Ratio)', () => {
    it('should calculate correct MAR', () => {
      // mouthLandmarks: left, right, top, bottom
      const mouthLandmarks: Landmark[] = [
        { x: 0.0, y: 0.0 }, // left corner
        { x: 4.0, y: 0.0 }, // right corner
        { x: 2.0, y: 1.0 }, // top lip
        { x: 2.0, y: -1.0 }, // bottom lip
      ];

      const mar = service.calculateMAR(mouthLandmarks);
      // distVertical = sqrt((2-2)^2 + (1 - -1)^2) = 2.0
      // distHorizontal = sqrt((4-0)^2 + (0-0)^2) = 4.0
      // MAR = 2.0 / 4.0 = 0.5
      expect(mar).toBeCloseTo(0.5, 4);
    });

    it('should return 0.0 if not enough landmarks are provided', () => {
      expect(service.calculateMAR([])).toBe(0.0);
    });
  });

  describe('Yaw Ratio Calculation (Head Turn)', () => {
    it('should calculate correct yaw ratio', () => {
      // faceLandmarks: [leftCheek, nose, rightCheek]
      const faceCentered: Landmark[] = [
        { x: 0.0, y: 0.0 },
        { x: 2.0, y: 0.0 },
        { x: 4.0, y: 0.0 },
      ];
      expect(service.calculateYawRatio(faceCentered)).toBeCloseTo(1.0, 4);

      const faceTurnedRight: Landmark[] = [
        { x: 0.0, y: 0.0 },
        { x: 1.0, y: 0.0 }, // nose closer to left cheek
        { x: 4.0, y: 0.0 },
      ];
      // distLeft = 1.0, distRight = 3.0 => 1.0 / 3.0 = 0.3333
      expect(service.calculateYawRatio(faceTurnedRight)).toBeCloseTo(0.3333, 4);
    });
  });

  describe('Challenge State Machine Progression', () => {
    it('should generate active challenges and proceed sequentially', () => {
      const state = service.resetSession(['BLINK', 'SMILE']);
      expect(state.challenges.length).toBe(2);
      expect(state.isComplete).toBe(false);
      expect(state.challenges[0].status).toBe('ACTIVE');
      expect(state.challenges[1].status).toBe('PENDING');

      // Force-complete the first challenge
      service.passCurrentChallenge();
      const nextState = service.getSessionState();
      expect(nextState.currentChallengeIndex).toBe(1);
      expect(nextState.challenges[0].status).toBe('PASSED');
      expect(nextState.challenges[1].status).toBe('ACTIVE');

      // Complete second challenge
      service.passCurrentChallenge();
      const finalState = service.getSessionState();
      expect(finalState.isComplete).toBe(true);
      expect(finalState.isPassed).toBe(true);
    });

    it('should process frames and increment counts for BLINK challenge', () => {
      service.resetSession(['BLINK']);
      
      // Initially active is BLINK (target 2 blinks)
      // Step 1: Normal frame (EAR = 0.35)
      let state = service.processFrame(0.35, 0.15, 1.0);
      expect(state.challenges[0].currentCount).toBe(0);

      // Step 2: Eyes closed (EAR = 0.15 < 0.22)
      state = service.processFrame(0.15, 0.15, 1.0);
      expect(state.challenges[0].currentCount).toBe(0);

      // Step 3: Eyes open back up (EAR = 0.35) -> triggers 1 blink
      state = service.processFrame(0.35, 0.15, 1.0);
      expect(state.challenges[0].currentCount).toBe(1);
      expect(state.isComplete).toBe(false);

      // Repeat to get second blink
      // Closed
      state = service.processFrame(0.15, 0.15, 1.0);
      // Open
      state = service.processFrame(0.35, 0.15, 1.0);
      
      // Should complete the session since target is 2
      expect(state.isComplete).toBe(true);
      expect(state.isPassed).toBe(true);
    });

    it('should process frames and complete SMILE challenge', () => {
      service.resetSession(['SMILE']);

      // Frame 1: No smile (MAR = 0.20)
      let state = service.processFrame(0.35, 0.20, 1.0);
      expect(state.isComplete).toBe(false);

      // Smile: MAR > 0.50 (e.g. 0.60) for 3 consecutive frames
      service.processFrame(0.35, 0.60, 1.0);
      service.processFrame(0.35, 0.60, 1.0);
      state = service.processFrame(0.35, 0.60, 1.0);

      expect(state.isComplete).toBe(true);
      expect(state.isPassed).toBe(true);
    });

    it('should process frames and complete HEAD_TURN challenge', () => {
      service.resetSession(['HEAD_TURN']);

      // Yaw ratio turned (e.g. 0.40 < 0.60) for 3 consecutive frames
      service.processFrame(0.35, 0.20, 0.40);
      service.processFrame(0.35, 0.20, 0.40);
      const state = service.processFrame(0.35, 0.20, 0.40);

      expect(state.isComplete).toBe(true);
      expect(state.isPassed).toBe(true);
    });
  });

  describe('Simulated Metrics', () => {
    it('should return simulated data based on active challenge type', () => {
      const metricsBlink = service.getSimulatedMetrics('BLINK', 900); // at 900ms, blink is active (ear = 0.14)
      expect(metricsBlink.ear).toBe(0.14);

      const metricsSmile = service.getSimulatedMetrics('SMILE', 2000); // smile build-up
      expect(metricsSmile.mar).toBeGreaterThan(0.40);
    });
  });
});
