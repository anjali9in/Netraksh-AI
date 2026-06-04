import {
  BLINK_THRESHOLD,
  SMILE_THRESHOLD,
  HEAD_TURN_LEFT_THRESHOLD,
  HEAD_TURN_RIGHT_THRESHOLD,
} from '../../config/thresholds';

export type LivenessChallengeType = 'BLINK' | 'SMILE' | 'HEAD_TURN';

export type Landmark = {
  x: number;
  y: number;
  z?: number;
};

export type LivenessChallenge = {
  type: LivenessChallengeType;
  instruction: string;
  status: 'PENDING' | 'ACTIVE' | 'PASSED' | 'FAILED';
  targetCount: number;
  currentCount: number;
};

export type LivenessSessionState = {
  challenges: LivenessChallenge[];
  currentChallengeIndex: number;
  isComplete: boolean;
  isPassed: boolean;
  errorMessage: string | null;
};

export class LivenessService {
  private activeChallenges: LivenessChallenge[] = [];
  private currentIndex: number = 0;
  private blinkFramesCount: number = 0;
  private headTurnFramesCount: number = 0;
  private smileFramesCount: number = 0;

  // Track state of challenges
  private earHistory: number[] = [];
  private marHistory: number[] = [];
  private yawHistory: number[] = [];

  constructor() {
    this.resetSession();
  }

  /**
   * Resets the liveness challenge session.
   * Generates a new sequence of challenges.
   */
  public resetSession(
    challengesToInclude?: LivenessChallengeType[],
  ): LivenessSessionState {
    const pool: LivenessChallengeType[] = challengesToInclude || [
      'BLINK',
      'SMILE',
      'HEAD_TURN',
    ];

    // Randomize the challenges
    const randomized = [...pool].sort(() => 0.5 - Math.random());

    // Take at least 2 challenges for a solid flow
    const selectedTypes = randomized.slice(0, Math.max(2, randomized.length));

    this.activeChallenges = selectedTypes.map(type => {
      let instruction = '';
      let targetCount = 1;

      switch (type) {
        case 'BLINK':
          instruction = 'Blink your eyes twice';
          targetCount = 2; // require 2 blinks
          break;
        case 'SMILE':
          instruction = 'Smile widely';
          targetCount = 1;
          break;
        case 'HEAD_TURN':
          instruction = 'Turn your head left or right';
          targetCount = 1;
          break;
      }

      return {
        type,
        instruction,
        status: 'PENDING',
        targetCount,
        currentCount: 0,
      };
    });

    if (this.activeChallenges.length > 0) {
      this.activeChallenges[0].status = 'ACTIVE';
    }

    this.currentIndex = 0;
    this.blinkFramesCount = 0;
    this.headTurnFramesCount = 0;
    this.smileFramesCount = 0;
    this.earHistory = [];
    this.marHistory = [];
    this.yawHistory = [];

    return this.getSessionState();
  }

  /**
   * Returns the current session state.
   */
  public getSessionState(): LivenessSessionState {
    const isComplete = this.currentIndex >= this.activeChallenges.length;
    const isPassed =
      isComplete && this.activeChallenges.every(c => c.status === 'PASSED');

    return {
      challenges: this.activeChallenges,
      currentChallengeIndex: this.currentIndex,
      isComplete,
      isPassed,
      errorMessage: null,
    };
  }

  /**
   * Calculates the Eye Aspect Ratio (EAR) from eye landmarks.
   * Standard EAR formula: (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
   */
  public calculateEAR(eyeLandmarks: Landmark[]): number {
    if (eyeLandmarks.length < 6) return 1.0;

    // eyeLandmarks: p1, p2, p3, p4, p5, p6
    const p1 = eyeLandmarks[0];
    const p2 = eyeLandmarks[1];
    const p3 = eyeLandmarks[2];
    const p4 = eyeLandmarks[3];
    const p5 = eyeLandmarks[4];
    const p6 = eyeLandmarks[5];

    const distVertical1 = Math.sqrt(
      Math.pow(p2.x - p6.x, 2) + Math.pow(p2.y - p6.y, 2),
    );
    const distVertical2 = Math.sqrt(
      Math.pow(p3.x - p5.x, 2) + Math.pow(p3.y - p5.y, 2),
    );
    const distHorizontal = Math.sqrt(
      Math.pow(p1.x - p4.x, 2) + Math.pow(p1.y - p4.y, 2),
    );

    if (distHorizontal === 0) return 1.0;

    return (distVertical1 + distVertical2) / (2.0 * distHorizontal);
  }

  /**
   * Calculates the Mouth Aspect Ratio (MAR) to detect smiling or opening of the mouth.
   * Formula: ||p_top - p_bottom|| / ||p_left - p_right||
   */
  public calculateMAR(mouthLandmarks: Landmark[]): number {
    if (mouthLandmarks.length < 4) return 0.0;

    // mouthLandmarks: left, right, top, bottom
    const left = mouthLandmarks[0];
    const right = mouthLandmarks[1];
    const top = mouthLandmarks[2];
    const bottom = mouthLandmarks[3];

    const distVertical = Math.sqrt(
      Math.pow(top.x - bottom.x, 2) + Math.pow(top.y - bottom.y, 2),
    );
    const distHorizontal = Math.sqrt(
      Math.pow(left.x - right.x, 2) + Math.pow(left.y - right.y, 2),
    );

    if (distHorizontal === 0) return 0.0;

    return distVertical / distHorizontal;
  }

  /**
   * Calculates the face Yaw (head turn direction).
   * Approximated by comparing relative distances from nose bridge to outer boundaries of cheeks.
   */
  public calculateYawRatio(faceLandmarks: Landmark[]): number {
    if (faceLandmarks.length < 3) return 1.0;

    // faceLandmarks: [leftCheekBoundary, noseBridge, rightCheekBoundary]
    const leftCheek = faceLandmarks[0];
    const nose = faceLandmarks[1];
    const rightCheek = faceLandmarks[2];

    const distLeft = Math.sqrt(Math.pow(nose.x - leftCheek.x, 2));
    const distRight = Math.sqrt(Math.pow(rightCheek.x - nose.x, 2));

    if (distRight === 0) return 1.0;
    return distLeft / distRight; // ratio close to 1.0 is centered, < 0.6 is right turn, > 1.6 is left turn
  }

  /**
   * Processes a frame of face landmarks. Evaluates the active challenge.
   * If the challenge conditions are met, progresses the challenge state machine.
   *
   * @param landmarks The full face landmark array.
   */
  public processFrame(
    earVal: number,
    marVal: number,
    yawRatioVal: number,
  ): LivenessSessionState {
    const state = this.getSessionState();
    if (state.isComplete) {
      return state;
    }

    const currentChallenge = this.activeChallenges[this.currentIndex];
    if (!currentChallenge || currentChallenge.status !== 'ACTIVE') {
      return state;
    }

    // Keep metrics histories
    this.earHistory.push(earVal);
    this.marHistory.push(marVal);
    this.yawHistory.push(yawRatioVal);
    if (this.earHistory.length > 50) this.earHistory.shift();
    if (this.marHistory.length > 50) this.marHistory.shift();
    if (this.yawHistory.length > 50) this.yawHistory.shift();

    switch (currentChallenge.type) {
      case 'BLINK':
        // Check for blink: EAR drops below threshold, then goes back up
        // We use a frame counter to ensure it's not a single noisy frame
        if (earVal < BLINK_THRESHOLD) {
          this.blinkFramesCount++;
        } else {
          // If we had a closed eye for at least 1-2 frames and now it is open again, register a blink
          if (this.blinkFramesCount >= 1 && this.blinkFramesCount < 30) {
            currentChallenge.currentCount++;
            console.log(
              `[LivenessService] Blink registered! Count: ${currentChallenge.currentCount}/${currentChallenge.targetCount}`,
            );
          }
          this.blinkFramesCount = 0;
        }

        if (currentChallenge.currentCount >= currentChallenge.targetCount) {
          this.passCurrentChallenge();
        }
        break;

      case 'SMILE':
        // Check for smile: MAR goes above threshold (wide mouth stretching)
        if (marVal > SMILE_THRESHOLD) {
          this.smileFramesCount++;
          if (this.smileFramesCount >= 3) {
            // held for 3 frames
            currentChallenge.currentCount++;
            this.passCurrentChallenge();
          }
        } else {
          this.smileFramesCount = 0;
        }
        break;

      case 'HEAD_TURN':
        // Check for head turn: Yaw ratio < right turn threshold or > left turn threshold
        if (yawRatioVal < HEAD_TURN_RIGHT_THRESHOLD || yawRatioVal > HEAD_TURN_LEFT_THRESHOLD) {
          this.headTurnFramesCount++;
          if (this.headTurnFramesCount >= 3) {
            // held head turn for 3 frames
            currentChallenge.currentCount++;
            this.passCurrentChallenge();
          }
        } else {
          this.headTurnFramesCount = 0;
        }
        break;
    }

    return this.getSessionState();
  }

  /**
   * Force progress/complete current challenge (e.g. for simulations or skips)
   */
  public passCurrentChallenge(): void {
    if (this.currentIndex < this.activeChallenges.length) {
      const current = this.activeChallenges[this.currentIndex];
      current.status = 'PASSED';
      current.currentCount = current.targetCount;

      this.currentIndex++;
      if (this.currentIndex < this.activeChallenges.length) {
        this.activeChallenges[this.currentIndex].status = 'ACTIVE';
      }

      console.log(
        `[LivenessService] Challenge ${current.type} PASSED. Progressed to index ${this.currentIndex}`,
      );
    }
  }

  /**
   * Helper to fetch simulated/mock metrics for DEMO_MODE
   * Simulates realistic movements based on the time elapsed
   */
  public getSimulatedMetrics(
    challengeType: LivenessChallengeType,
    timeMs: number,
  ): {ear: number; mar: number; yawRatio: number} {
    const tick = Math.round(timeMs / 100);
    let ear = 0.32; // Default open
    let mar = 0.18; // Default neutral
    let yawRatio = 1.0; // Default centered

    switch (challengeType) {
      case 'BLINK':
        // We want to simulate a blink twice.
        // First blink: eyes close at ticks 8-9 (800ms-900ms), open at tick 10 (1000ms)
        // Second blink: eyes close at ticks 18-19 (1800ms-1900ms), open at tick 20 (2000ms)
        if ((tick >= 8 && tick <= 9) || (tick >= 18 && tick <= 19)) {
          ear = 0.14; // Closed eye
        }
        break;

      case 'SMILE':
        // Smile builds up: reach wide smile (>SMILE_THRESHOLD) by tick 10 (1000ms) and hold it
        if (tick >= 10) {
          mar = SMILE_THRESHOLD + 0.05; // 0.55
        } else {
          mar = 0.18 + (tick / 10) * (SMILE_THRESHOLD - 0.18 + 0.05);
        }
        break;

      case 'HEAD_TURN':
        // Turn head: reach turn (>HEAD_TURN_LEFT_THRESHOLD) by tick 10 (1000ms) and hold it
        if (tick >= 10) {
          yawRatio = HEAD_TURN_LEFT_THRESHOLD + 0.1; // 1.7
        } else {
          yawRatio = 1.0 + (tick / 10) * (HEAD_TURN_LEFT_THRESHOLD - 1.0 + 0.1);
        }
        break;
    }

    return {ear, mar, yawRatio};
  }
}

export const livenessService = new LivenessService();
