import {
  ENROLLMENT_CHALLENGE_ORDER,
  type LivenessChallenge,
  type LivenessChallengeType,
  type LivenessSessionState,
} from './livenessService';
import {
  BLINK_EAR_ASPECT_CLOSED,
  BLINK_EYE_OPEN_CLOSED,
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

const SMILE_MAR_HINT = 0.3;

function passedMessage(type: LivenessChallengeType): string {
  switch (type) {
    case 'BLINK':
      return 'Blink detected';
    case 'SMILE':
      return 'Smile detected';
    case 'HEAD_TURN':
      return 'Head movement detected';
  }
}

function challengeTitle(type: LivenessChallengeType): string {
  switch (type) {
    case 'BLINK':
      return 'Blink check';
    case 'SMILE':
      return 'Smile check';
    case 'HEAD_TURN':
      return 'Head turn check';
  }
}

export type ChallengeRowStatus = {
  title: string;
  detail: string;
  status: 'pending' | 'active' | 'passed';
};

export function buildChallengeRows(
  state: LivenessSessionState | null,
): ChallengeRowStatus[] {
  if (!state) {
    return [];
  }

  return state.challenges.map(challenge => {
    if (challenge.status === 'PASSED') {
      return {
        title: challengeTitle(challenge.type),
        detail: passedMessage(challenge.type),
        status: 'passed',
      };
    }

    if (challenge.status === 'ACTIVE') {
      let detail = challenge.instruction;
      if (challenge.type === 'BLINK' && challenge.targetCount > 1) {
        detail = `${challenge.instruction} (${challenge.currentCount}/${challenge.targetCount})`;
      }
      return {
        title: challengeTitle(challenge.type),
        detail,
        status: 'active',
      };
    }

    return {
      title: challengeTitle(challenge.type),
      detail: 'Up next',
      status: 'pending',
    };
  });
}

/**
 * Short live hint shown under the active challenge (updates every liveness frame).
 */
export function getLiveChallengeHint(
  state: LivenessSessionState | null,
  metrics: {
    ear: number;
    mar: number;
    yawRatio: number;
    avgEyeOpen?: number;
    smilingProbability?: number;
    rotationY?: number;
  },
  options?: {relaxed?: boolean},
): string | null {
  if (!state || state.isComplete) {
    return null;
  }

  const activeChallenges = state.challenges.filter(c => c.status === 'ACTIVE');
  if (activeChallenges.length === 0) {
    return null;
  }

  const active =
    activeChallenges.length === 1
      ? activeChallenges[0]
      : activeChallenges.find(
          c =>
            c.type ===
            ENROLLMENT_CHALLENGE_ORDER.find(
              type => !state.challenges.some(ch => ch.type === type && ch.status === 'PASSED'),
            ),
        ) ?? activeChallenges[0];

  const relaxed = options?.relaxed ?? false;
  if (activeChallenges.length > 1) {
    const passed = state.challenges.filter(c => c.status === 'PASSED').length;
    const total = state.challenges.length;
    const specific = hintForActiveChallenge(active, metrics, relaxed);
    return `${passed}/${total} done — ${specific ?? 'turn or blink'}`;
  }

  return hintForActiveChallenge(active, metrics, relaxed);
}

function hintForActiveChallenge(
  active: LivenessChallenge,
  metrics: {
    ear: number;
    mar: number;
    yawRatio: number;
    avgEyeOpen?: number;
    smilingProbability?: number;
    rotationY?: number;
  },
  relaxed: boolean,
): string | null {
  const headLow = relaxed
    ? HEAD_TURN_RIGHT_THRESHOLD_RELAXED
    : HEAD_TURN_RIGHT_THRESHOLD;
  const headHigh = relaxed
    ? HEAD_TURN_LEFT_THRESHOLD_RELAXED
    : HEAD_TURN_LEFT_THRESHOLD;
  const minRotation = relaxed
    ? HEAD_TURN_ROTATION_DEGREES_RELAXED
    : HEAD_TURN_ROTATION_DEGREES;
  const smileThreshold = SMILE_PROBABILITY_DETECTED;

  switch (active.type) {
    case 'BLINK': {
      const eyesClosed =
        metrics.avgEyeOpen !== undefined
          ? metrics.avgEyeOpen < BLINK_EYE_OPEN_CLOSED
          : metrics.ear < BLINK_EAR_ASPECT_CLOSED ||
            metrics.ear < BLINK_THRESHOLD;
      if (eyesClosed) {
        return 'blink: close then open your eyes';
      }
      if (active.currentCount > 0 && active.targetCount > 1) {
        return `blink again (${active.currentCount}/${active.targetCount})`;
      }
      return 'blink once';
    }
    case 'SMILE':
      if (
        metrics.smilingProbability !== undefined &&
        metrics.smilingProbability >= smileThreshold
      ) {
        return 'smile detected — hold it';
      }
      if (metrics.mar >= (relaxed ? 0.3 : SMILE_MAR_DETECTED)) {
        return 'smile detected — hold it';
      }
      if (metrics.mar >= SMILE_MAR_HINT) {
        return 'smile forming — keep smiling';
      }
      return 'smile and hold';
    case 'HEAD_TURN': {
      const turnedByRotation =
        metrics.rotationY !== undefined &&
        Math.abs(metrics.rotationY) >= minRotation;
      if (metrics.yawRatio < headLow || turnedByRotation) {
        return 'head turn detected — hold it';
      }
      if (metrics.yawRatio > headHigh) {
        return 'head turn detected — hold it';
      }
      return 'turn head left or right';
    }
    default:
      return null;
  }
}

/**
 * One-shot toast when a challenge advances (blink count++, challenge passed).
 */
export function detectChallengePulse(
  previous: LivenessSessionState | null,
  next: LivenessSessionState,
): string | null {
  if (!previous) {
    return null;
  }

  for (let i = 0; i < next.challenges.length; i++) {
    const before = previous.challenges[i];
    const after = next.challenges[i];
    if (!before || !after) {
      continue;
    }

    if (before.status !== 'PASSED' && after.status === 'PASSED') {
      return `${passedMessage(after.type)}!`;
    }

    if (
      after.type === 'BLINK' &&
      after.status === 'ACTIVE' &&
      after.currentCount > before.currentCount
    ) {
      return `Blink detected (${after.currentCount}/${after.targetCount})`;
    }
  }

  if (!next.isComplete && next.isPassed) {
    return 'All challenges passed';
  }

  return null;
}

export function getChallengeSummary(challenge: LivenessChallenge): string {
  if (challenge.status === 'PASSED') {
    return passedMessage(challenge.type);
  }
  if (challenge.status === 'ACTIVE' && challenge.type === 'BLINK') {
    return `${challenge.currentCount}/${challenge.targetCount} blinks`;
  }
  if (challenge.status === 'ACTIVE') {
    return 'In progress';
  }
  return 'Pending';
}
