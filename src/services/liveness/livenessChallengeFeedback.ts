import {
  type LivenessChallenge,
  type LivenessChallengeType,
  type LivenessSessionState,
} from './livenessService';
import {
  BLINK_EAR_ASPECT_CLOSED,
  BLINK_EYE_OPEN_CLOSED,
  BLINK_EYE_OPEN_OPEN,
  BLINK_THRESHOLD,
  SMILE_MAR_DETECTED,
  SMILE_PROBABILITY_DETECTED,
} from '../../config/thresholds';

const SMILE_MAR_HINT = 0.3;
const HEAD_TURN_LOW = 0.6;
const HEAD_TURN_HIGH = 1.6;

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
      detail: 'Waiting',
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
  },
): string | null {
  if (!state || state.isComplete) {
    return null;
  }

  const active = state.challenges[state.currentChallengeIndex];
  if (!active || active.status !== 'ACTIVE') {
    return null;
  }

  switch (active.type) {
    case 'BLINK': {
      const eyesClosed =
        metrics.avgEyeOpen !== undefined
          ? metrics.avgEyeOpen < BLINK_EYE_OPEN_CLOSED
          : metrics.ear < BLINK_EAR_ASPECT_CLOSED ||
            metrics.ear < BLINK_THRESHOLD;
      if (eyesClosed) {
        return 'Eyes closed detected — open your eyes to register the blink';
      }
      if (active.currentCount > 0) {
        return `Blink ${active.currentCount}/${active.targetCount} registered — blink again`;
      }
      return 'Close both eyes briefly, then open (repeat twice)';
    }
      case 'SMILE':
        if (
          metrics.smilingProbability !== undefined &&
          metrics.smilingProbability >= SMILE_PROBABILITY_DETECTED
        ) {
          return 'Smile detected — hold it';
        }
        if (metrics.mar >= SMILE_MAR_DETECTED) {
          return 'Smile detected — hold it';
        }
        if (metrics.mar >= SMILE_MAR_HINT) {
          return 'Smile forming — keep smiling';
        }
        return null;
    case 'HEAD_TURN':
      if (metrics.yawRatio < HEAD_TURN_LOW) {
        return 'Head turn right detected — hold it';
      }
      if (metrics.yawRatio > HEAD_TURN_HIGH) {
        return 'Head turn left detected — hold it';
      }
      return null;
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
