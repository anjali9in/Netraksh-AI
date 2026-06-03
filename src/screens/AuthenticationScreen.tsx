import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Alert, StyleSheet, Text, View} from 'react-native';

import {AppHeader} from '../components/AppHeader';
import {CameraCaptureCard} from '../components/CameraCaptureCard';
import {EmployeeInput} from '../components/EmployeeInput';
import {InfoCard} from '../components/InfoCard';
import {PrimaryButton} from '../components/PrimaryButton';
import {ScreenContainer} from '../components/ScreenContainer';
import {StatusBadge} from '../components/StatusBadge';
import {getDynamicThreshold} from '../ai/dynamicThreshold';
import {FACE_RECOGNITION_MODEL} from '../ai/modelConfig';
import {offlineDatabaseService} from '../services/OfflineDatabaseService';
import {secureStorageService} from '../services/SecureStorageService';
import {
  livenessService,
  LivenessSessionState,
} from '../services/liveness/livenessService';
import {colors} from '../theme/colors';
import {radius, spacing} from '../theme/spacing';

type AuthStep =
  | 'ID_INPUT'
  | 'CAMERA_CAPTURE'
  | 'LIVENESS_CHALLENGE'
  | 'MATCHING'
  | 'RESULT';

export function AuthenticationScreen(): React.JSX.Element {
  const [employeeId, setEmployeeId] = useState('');
  const [capturedImagePath, setCapturedImagePath] = useState<string | null>(
    null,
  );
  const [step, setStep] = useState<AuthStep>('ID_INPUT');
  const [livenessState, setLivenessState] =
    useState<LivenessSessionState | null>(null);
  const [metrics, setMetrics] = useState({ear: 0.32, mar: 0.18, yawRatio: 1.0});
  const [authResult, setAuthResult] = useState<{
    success: boolean;
    score?: number;
    matchTimeMs?: number;
    reason?: string;
    logHash?: string;
  } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const startVerification = () => {
    if (!employeeId.trim()) {
      Alert.alert('Validation Error', 'Please enter your Employee ID first.');
      return;
    }
    setStep('CAMERA_CAPTURE');
  };

  const handlePhotoCaptured = (image: {path: string}) => {
    setCapturedImagePath(image.path);
    startLivenessChallenges();
  };

  const startLivenessChallenges = () => {
    const initialState = livenessService.resetSession();
    setLivenessState(initialState);
    setStep('LIVENESS_CHALLENGE');
    startTimeRef.current = Date.now();

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const session = livenessService.getSessionState();
      const currentChallenge =
        session.challenges[session.currentChallengeIndex];

      if (!currentChallenge) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        runFaceMatching();
        return;
      }

      const sim = livenessService.getSimulatedMetrics(
        currentChallenge.type,
        elapsed,
      );
      setMetrics(sim);

      const updatedState = livenessService.processFrame(
        sim.ear,
        sim.mar,
        sim.yawRatio,
      );
      setLivenessState(updatedState);

      if (updatedState.isComplete && updatedState.isPassed) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        runFaceMatching();
      }
    }, 100);
  };

  const runFaceMatching = async () => {
    setStep('MATCHING');

    const simulatedBrightness = 90 + Math.floor(Math.random() * 60);
    const simulatedQuality = 0.85 + Math.random() * 0.12;
    const dynamicResult = getDynamicThreshold(
      simulatedBrightness,
      simulatedQuality,
    );

    try {
      const startTime = Date.now();
      const matchResult = await secureStorageService.verifyFace(
        employeeId.trim().toUpperCase(),
        capturedImagePath || 'mock://captured-face.jpg',
        dynamicResult.threshold,
      );
      const elapsedMs = Date.now() - startTime;

      const logId = await offlineDatabaseService.logAuthAttempt({
        employeeId: employeeId.trim().toUpperCase(),
        authStatus: matchResult.success ? 'SUCCESS' : 'FAILED',
        failureReason: matchResult.success
          ? null
          : matchResult.error || 'Face template mismatch',
        similarityScore:
          matchResult.score !== undefined ? matchResult.score : null,
        livenessStatus: 'PASSED',
        challengeType:
          livenessService.getSessionState().challenges[0]?.type || 'BLINK',
        deviceId: 'device-tablet-01',
        modelVersion: FACE_RECOGNITION_MODEL.modelName,
      });

      let logHash = '';
      if (logId) {
        const logs = await offlineDatabaseService.getAllLogs();
        const found = logs.find(log => log.id === logId);
        if (found) {
          logHash = found.logHash || '';
        }
      }

      setAuthResult({
        success: matchResult.success,
        score: matchResult.score,
        matchTimeMs: elapsedMs,
        reason: matchResult.success
          ? undefined
          : matchResult.error || 'Face template mismatch',
        logHash,
      });
      setStep('RESULT');
    } catch (error) {
      console.error(error);
      setAuthResult({
        success: false,
        reason: 'Internal verification pipeline error.',
      });
      setStep('RESULT');
    }
  };

  const resetAll = () => {
    setEmployeeId('');
    setCapturedImagePath(null);
    setAuthResult(null);
    setLivenessState(null);
    setStep('ID_INPUT');
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const currentChallenge =
    livenessState?.challenges[livenessState.currentChallengeIndex];

  return (
    <ScreenContainer contentContainerStyle={styles.container}>
      <AppHeader
        title="Authenticate User"
        subtitle="Verify employee identity with local face matching and liveness checks."
        statusLabel="Offline auth enabled"
        status="success"
      />

      {step === 'ID_INPUT' ? (
        <InfoCard
          title="Secure Face Login"
          subtitle="Enter the employee ID before starting the on-device verification flow."
          style={styles.section}
        >
          <EmployeeInput
            helperText="Authentication attempts are logged locally with integrity hashes."
            onChangeText={setEmployeeId}
            value={employeeId}
          />
          <View style={styles.primaryAction}>
            <PrimaryButton
              icon="shield"
              title="Start Verification"
              onPress={startVerification}
            />
          </View>
        </InfoCard>
      ) : null}

      {step === 'CAMERA_CAPTURE' ? (
        <View style={styles.section}>
          <CameraCaptureCard
            title="Facial Login"
            description="Center your face inside the guide frame to start the liveness sequence."
            validationMessages={[
              'Face not centered',
              'Low light',
              'Blink detected',
            ]}
            onPhotoCaptured={handlePhotoCaptured}
            onPhotoCleared={() => setCapturedImagePath(null)}
          />
        </View>
      ) : null}

      {step === 'LIVENESS_CHALLENGE' && livenessState ? (
        <View style={[styles.section, styles.hudCard]}>
          <View style={styles.hudHeader}>
            <View>
              <Text style={styles.hudEyebrow}>LIVENESS VERIFICATION</Text>
              <Text style={styles.hudTitle}>Active Challenge</Text>
            </View>
            <StatusBadge compact label="Live" status="success" />
          </View>

          <View style={styles.challengeBox}>
            <ActivityIndicator color={colors.success} style={styles.loader} />
            <Text style={styles.challengeInstruction}>
              {currentChallenge?.instruction}
            </Text>
            <Text style={styles.challengeProgress}>
              Challenge {livenessState.currentChallengeIndex + 1} of{' '}
              {livenessState.challenges.length}
            </Text>
          </View>

          <MetricBar
            label="Eye Aspect Ratio (EAR)"
            value={metrics.ear}
            helper={`${metrics.ear.toFixed(3)} | Threshold < 0.22`}
            widthPercent={Math.min(100, metrics.ear * 250)}
            active={metrics.ear < 0.22}
          />
          <MetricBar
            label="Mouth Aspect Ratio (MAR)"
            value={metrics.mar}
            helper={`${metrics.mar.toFixed(3)} | Threshold > 0.50`}
            widthPercent={Math.min(100, metrics.mar * 150)}
            active={metrics.mar > 0.5}
          />
          <MetricBar
            label="Yaw Ratio (Head Orientation)"
            value={metrics.yawRatio}
            helper={`${metrics.yawRatio.toFixed(3)} | Centered near 1.0`}
            widthPercent={Math.min(100, metrics.yawRatio * 50)}
            active={metrics.yawRatio < 0.6 || metrics.yawRatio > 1.6}
          />
        </View>
      ) : null}

      {step === 'MATCHING' ? (
        <InfoCard style={styles.section}>
          <View style={styles.matchingContent}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.matchingText}>Verifying face embeddings</Text>
            <Text style={styles.matchingSubtext}>
              Matching 512-dim face landmarks against encrypted offline
              templates.
            </Text>
          </View>
        </InfoCard>
      ) : null}

      {step === 'RESULT' && authResult ? (
        <InfoCard
          title={
            authResult.success ? 'Authentication Success' : 'Access Denied'
          }
          subtitle={
            authResult.success
              ? 'Attendance logged offline with tamper-evident hash.'
              : 'Failed attempt was recorded for audit review.'
          }
          style={styles.section}
        >
          <StatusBadge
            label={
              authResult.success
                ? 'Access granted'
                : authResult.reason || 'Access denied'
            }
            status={authResult.success ? 'success' : 'error'}
          />

          <View style={styles.detailsBox}>
            <DetailRow label="Employee ID" value={employeeId.toUpperCase()} />
            {authResult.score !== undefined ? (
              <DetailRow
                label="Similarity Score"
                value={authResult.score.toFixed(4)}
              />
            ) : null}
            {authResult.matchTimeMs !== undefined ? (
              <DetailRow
                label="Pipeline Time"
                value={`${authResult.matchTimeMs} ms`}
              />
            ) : null}
            {authResult.reason ? (
              <DetailRow label="Failure Reason" value={authResult.reason} />
            ) : null}
            {authResult.logHash ? (
              <View style={styles.hashBox}>
                <Text style={styles.hashLabel}>Integrity Hash (SHA-256)</Text>
                <Text style={styles.hashText} numberOfLines={2}>
                  {authResult.logHash}
                </Text>
              </View>
            ) : null}
          </View>

          <PrimaryButton title="Done" onPress={resetAll} />
        </InfoCard>
      ) : null}
    </ScreenContainer>
  );
}

function MetricBar({
  label,
  helper,
  widthPercent,
  active,
}: {
  label: string;
  value: number;
  helper: string;
  widthPercent: number;
  active: boolean;
}): React.JSX.Element {
  return (
    <View style={styles.metricContainer}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.barBackground}>
        <View
          style={[
            styles.barFill,
            {width: `${widthPercent}%`},
            active ? styles.barActive : styles.barIdle,
          ]}
        />
      </View>
      <Text style={styles.metricHelper}>{helper}</Text>
    </View>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  barActive: {
    backgroundColor: colors.success,
  },
  barBackground: {
    backgroundColor: '#d8e2ef',
    borderRadius: radius.round,
    height: 9,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  barFill: {
    borderRadius: radius.round,
    height: '100%',
  },
  barIdle: {
    backgroundColor: colors.accent,
  },
  challengeBox: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  challengeInstruction: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  challengeProgress: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  container: {
    backgroundColor: colors.background,
    paddingBottom: spacing.xxxl,
  },
  detailLabel: {
    color: colors.textSubtle,
    fontSize: 13,
    fontWeight: '800',
  },
  detailRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  detailValue: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    marginLeft: spacing.md,
    textAlign: 'right',
  },
  detailsBox: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  hashBox: {
    paddingVertical: spacing.md,
  },
  hashLabel: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '800',
  },
  hashText: {
    color: colors.textMuted,
    fontFamily: 'Courier',
    fontSize: 11,
    lineHeight: 15,
    marginTop: spacing.xs,
  },
  hudCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  hudEyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  hudHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hudTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  loader: {
    marginBottom: spacing.sm,
  },
  matchingContent: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  matchingSubtext: {
    color: colors.textSubtle,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  matchingText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: spacing.md,
  },
  metricContainer: {
    marginTop: spacing.lg,
  },
  metricHelper: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '700',
    marginTop: spacing.sm,
    textAlign: 'right',
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  primaryAction: {
    marginTop: spacing.lg,
  },
  section: {
    marginTop: spacing.xl,
  },
});
