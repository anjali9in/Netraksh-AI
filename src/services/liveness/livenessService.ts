import {
  BLINK_EAR_ASPECT_CLOSED,
  BLINK_EAR_ASPECT_OPEN,
  BLINK_EYE_OPEN_CLOSED,
  BLINK_EYE_OPEN_OPEN,
  BLINK_THRESHOLD,
  HEAD_TURN_LEFT_THRESHOLD,
  HEAD_TURN_LEFT_THRESHOLD_RELAXED,
  HEAD_TURN_RIGHT_THRESHOLD,
  HEAD_TURN_RIGHT_THRESHOLD_RELAXED,
  HEAD_TURN_ROTATION_DEGREES,
  HEAD_TURN_ROTATION_DEGREES_RELAXED,
  SMILE_MAR_DETECTED,
  SMILE_PROBABILITY_DETECTED,
} from '../../config/thresholds';

export type LivenessChallengeType = 'BLINK' | 'SMILE' | 'HEAD_TURN';

/** Predictable enrollment flow: turn → blink → smile. */
export const ENROLLMENT_CHALLENGE_ORDER: LivenessChallengeType[] = [
  'HEAD_TURN',
  'BLINK',
  'SMILE',
];

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

export type LivenessSessionOptions = {
  /** Easier thresholds and fewer blinks (enrollment). */
  relaxed?: boolean;
  /** Evaluate every challenge each frame (enrollment — any gesture order). */
  parallel?: boolean;
};

/** Shown when all enrollment challenges are active at once. */
export const ENROLLMENT_COMBINED_INSTRUCTION =
  'Turn your head, blink once, and smile (any order)';

export class LivenessService {
  private activeChallenges: LivenessChallenge[] = [];
  private currentIndex: number = 0;
  private blinkFramesCount: number = 0;
  private blinkEyePhase: 'open' | 'closed' = 'open';
  private headTurnFramesCount: number = 0;
  private smileFramesCount: number = 0;
  private relaxedMode: boolean = false;
  private parallelMode: boolean = false;

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
    options?: LivenessSessionOptions,
  ): LivenessSessionState {
    this.relaxedMode = options?.relaxed ?? false;
    this.parallelMode = options?.parallel ?? false;
    const pool: LivenessChallengeType[] = challengesToInclude || [
      'BLINK',
      'SMILE',
      'HEAD_TURN',
    ];

    const selectedTypes = challengesToInclude
      ? [...challengesToInclude]
      : [...pool]
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.max(2, pool.length));

    this.activeChallenges = selectedTypes.map(type => {
      let instruction = '';
      let targetCount = 1;

      switch (type) {
        case 'BLINK':
          instruction = this.relaxedMode
            ? 'Blink your eyes once'
            : 'Blink your eyes twice';
          targetCount = this.relaxedMode ? 1 : 2;
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
      if (this.parallelMode) {
        for (const challenge of this.activeChallenges) {
          challenge.status = 'ACTIVE';
        }
      } else {
        this.activeChallenges[0].status = 'ACTIVE';
      }
    }

    this.currentIndex = 0;
    this.syncCurrentIndex();
    this.blinkFramesCount = 0;
    this.blinkEyePhase = 'open';
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
      challenges: this.activeChallenges.map(challenge => ({...challenge})),
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
    avgEyeOpenProbability?: number,
    smilingProbability?: number,
    rotationY?: number,
  ): LivenessSessionState {
    const state = this.getSessionState();
    if (state.isComplete) {
      return state;
    }

    const challengesToEvaluate = this.parallelMode
      ? this.activeChallenges.filter(c => c.status === 'ACTIVE')
      : (() => {
          const current = this.activeChallenges[this.currentIndex];
          return current?.status === 'ACTIVE' ? [current] : [];
        })();

    if (challengesToEvaluate.length === 0) {
      return state;
    }

    this.earHistory.push(earVal);
    this.marHistory.push(marVal);
    this.yawHistory.push(yawRatioVal);
    if (this.earHistory.length > 50) this.earHistory.shift();
    if (this.marHistory.length > 50) this.marHistory.shift();
    if (this.yawHistory.length > 50) this.yawHistory.shift();

    for (const challenge of challengesToEvaluate) {
      switch (challenge.type) {
        case 'BLINK':
          this.evaluateBlinkChallenge(
            challenge,
            earVal,
            avgEyeOpenProbability,
          );
          break;
        case 'SMILE':
          this.evaluateSmileChallenge(
            challenge,
            marVal,
            smilingProbability,
          );
          break;
        case 'HEAD_TURN':
          this.evaluateHeadTurnChallenge(
            challenge,
            yawRatioVal,
            rotationY,
          );
          break;
      }
    }

    return this.getSessionState();
  }

  private evaluateBlinkChallenge(
    challenge: LivenessChallenge,
    earVal: number,
    avgEyeOpenProbability?: number,
  ): void {
    if (challenge.status !== 'ACTIVE') {
      return;
    }

    const usesEyeProbability =
      avgEyeOpenProbability !== undefined &&
      !Number.isNaN(avgEyeOpenProbability);

    if (usesEyeProbability) {
      if (avgEyeOpenProbability < BLINK_EYE_OPEN_CLOSED) {
        this.blinkEyePhase = 'closed';
      } else if (
        this.blinkEyePhase === 'closed' &&
        avgEyeOpenProbability > BLINK_EYE_OPEN_OPEN
      ) {
        this.blinkEyePhase = 'open';
        challenge.currentCount++;
        console.log(
          `[LivenessService] Blink registered! Count: ${challenge.currentCount}/${challenge.targetCount}`,
        );
      }
    } else {
      const eyesClosed =
        earVal < BLINK_EAR_ASPECT_CLOSED || earVal < BLINK_THRESHOLD;
      const eyesOpen =
        earVal > BLINK_EAR_ASPECT_OPEN || earVal >= BLINK_THRESHOLD;

      if (eyesClosed) {
        this.blinkFramesCount++;
      } else if (eyesOpen) {
        if (this.blinkFramesCount >= 1 && this.blinkFramesCount < 20) {
          challenge.currentCount++;
          console.log(
            `[LivenessService] Blink registered! Count: ${challenge.currentCount}/${challenge.targetCount}`,
          );
        }
        this.blinkFramesCount = 0;
      }
    }

    if (challenge.currentCount >= challenge.targetCount) {
      this.passChallenge(challenge);
    }
  }

  private evaluateSmileChallenge(
    challenge: LivenessChallenge,
    marVal: number,
    smilingProbability?: number,
  ): void {
    if (challenge.status !== 'ACTIVE') {
      return;
    }

    const usesSmileProbability =
      smilingProbability !== undefined && !Number.isNaN(smilingProbability);
    const isSmiling = usesSmileProbability
      ? smilingProbability > SMILE_PROBABILITY_DETECTED
      : marVal > (this.relaxedMode ? 0.3 : SMILE_MAR_DETECTED);
    const framesRequired = this.relaxedMode ? 2 : 3;

    if (isSmiling) {
      this.smileFramesCount++;
      if (this.smileFramesCount >= framesRequired) {
        challenge.currentCount++;
        console.log('[LivenessService] Smile registered!');
        this.passChallenge(challenge);
      }
    } else {
      this.smileFramesCount = 0;
    }
  }

  private evaluateHeadTurnChallenge(
    challenge: LivenessChallenge,
    yawRatioVal: number,
    rotationY?: number,
  ): void {
    if (challenge.status !== 'ACTIVE') {
      return;
    }

    const low = this.relaxedMode
      ? HEAD_TURN_RIGHT_THRESHOLD_RELAXED
      : HEAD_TURN_RIGHT_THRESHOLD;
    const high = this.relaxedMode
      ? HEAD_TURN_LEFT_THRESHOLD_RELAXED
      : HEAD_TURN_LEFT_THRESHOLD;
    const framesRequired = this.relaxedMode ? 1 : 2;
    const minRotation = this.relaxedMode
      ? HEAD_TURN_ROTATION_DEGREES_RELAXED
      : HEAD_TURN_ROTATION_DEGREES;
    const turnedByRotation =
      rotationY !== undefined &&
      !Number.isNaN(rotationY) &&
      Math.abs(rotationY) >= minRotation;
    const turnedByRatio = yawRatioVal < low || yawRatioVal > high;

    if (turnedByRotation || turnedByRatio) {
      this.headTurnFramesCount++;
      if (this.headTurnFramesCount >= framesRequired) {
        challenge.currentCount++;
        this.passChallenge(challenge);
      }
    } else {
      this.headTurnFramesCount = 0;
    }
  }

  private passChallenge(challenge: LivenessChallenge): void {
    if (challenge.status === 'PASSED') {
      return;
    }

    challenge.status = 'PASSED';
    challenge.currentCount = challenge.targetCount;

    if (this.parallelMode) {
      this.syncCurrentIndex();
    } else if (
      this.currentIndex < this.activeChallenges.length &&
      this.activeChallenges[this.currentIndex] === challenge
    ) {
      this.currentIndex++;
      if (this.currentIndex < this.activeChallenges.length) {
        this.activeChallenges[this.currentIndex].status = 'ACTIVE';
      }
    }

    console.log(
      `[LivenessService] Challenge ${challenge.type} PASSED. Progressed to index ${this.currentIndex}`,
    );
  }

  private syncCurrentIndex(): void {
    const nextIncomplete = this.activeChallenges.findIndex(
      c => c.status !== 'PASSED',
    );
    this.currentIndex =
      nextIncomplete === -1
        ? this.activeChallenges.length
        : nextIncomplete;
  }

  /**
   * Force progress/complete current challenge (e.g. for simulations or skips)
   */
  public passCurrentChallenge(): void {
    if (this.currentIndex < this.activeChallenges.length) {
      this.passChallenge(this.activeChallenges[this.currentIndex]);
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
        if (tick >= 10) {
          mar = SMILE_MAR_DETECTED + 0.15;
        } else {
          mar = 0.18 + (tick / 10) * (SMILE_MAR_DETECTED + 0.05);
        }
        break;

      case 'HEAD_TURN':
        if (tick >= 10) {
          yawRatio = 1.7;
        } else {
          yawRatio = 1.0 + (tick / 10) * 0.7;
        }
        break;
    }

    return {ear, mar, yawRatio};
  }
}

export const livenessService = new LivenessService();
