import React, {useState} from 'react';
import {ActivityIndicator, Alert, StyleSheet, Text, View} from 'react-native';

import {AppHeader} from '../components/AppHeader';
import {EmployeeInput} from '../components/EmployeeInput';
import {InfoCard} from '../components/InfoCard';
import {LiveScannerPanel} from '../components/LiveScannerPanel';
import {PrimaryButton} from '../components/PrimaryButton';
import {ScreenContainer} from '../components/ScreenContainer';
import {StatusBadge} from '../components/StatusBadge';
import {getDynamicThreshold} from '../ai/dynamicThreshold';
import {FACE_RECOGNITION_MODEL} from '../ai/modelConfig';
import {offlineDatabaseService} from '../services/OfflineDatabaseService';
import {secureStorageService} from '../services/SecureStorageService';
import {livenessService} from '../services/liveness/livenessService';
import {colors} from '../theme/colors';
import {radius, spacing} from '../theme/spacing';
import {getLocalDatabase} from '../services/database/localDatabase';

type AuthStep = 'ID_INPUT' | 'LIVE_SCANNING' | 'MATCHING' | 'RESULT';

export function AuthenticationScreen(): React.JSX.Element {
  const [employeeId, setEmployeeId] = useState('');
  const [step, setStep] = useState<AuthStep>('ID_INPUT');
  const [authResult, setAuthResult] = useState<{
    success: boolean;
    score?: number;
    matchTimeMs?: number;
    reason?: string;
    logHash?: string;
  } | null>(null);

  const startVerification = () => {
    if (!employeeId.trim()) {
      Alert.alert('Validation Error', 'Please enter your Employee ID first.');
      return;
    }
    setStep('LIVE_SCANNING');
  };

  const runFaceMatching = async (imagePath: string) => {
    setStep('MATCHING');

    const simulatedBrightness = 90 + Math.floor(Math.random() * 60);
    const simulatedQuality = 0.85 + Math.random() * 0.12;
    const dynamicResult = getDynamicThreshold(
      simulatedBrightness,
      simulatedQuality,
    );

    try {
      const startTime = Date.now();
      const formattedEmpId = employeeId.trim().toUpperCase();

      // Check if the user's face is registered first
      const db = await getLocalDatabase();
      const checkResult = await db.execute(
        `SELECT employee_id FROM employee_face_templates WHERE employee_id = ?`,
        [formattedEmpId],
      );

      if (checkResult.rows.length === 0) {
        console.log(`[AuthenticationScreen] Employee ${formattedEmpId} not registered. Auto-registering...`);
        const registerSuccess = await secureStorageService.registerFace(
          formattedEmpId,
          imagePath || 'mock://captured-face.jpg',
          'device-tablet-01',
        );
        if (!registerSuccess) {
          throw new Error('Auto-registration of face template failed.');
        }
      }

      const matchResult = await secureStorageService.verifyFace(
        formattedEmpId,
        imagePath || 'mock://captured-face.jpg',
        dynamicResult.threshold,
      );
      const elapsedMs = Date.now() - startTime;

      const logId = await offlineDatabaseService.logAuthAttempt({
        employeeId: formattedEmpId,
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
        reason: error instanceof Error ? error.message : 'Internal verification pipeline error.',
      });
      setStep('RESULT');
    }
  };

  const handleLivenessFailed = async (reason: string) => {
    setStep('MATCHING');
    try {
      const formattedEmpId = employeeId.trim().toUpperCase();

      const logId = await offlineDatabaseService.logAuthAttempt({
        employeeId: formattedEmpId,
        authStatus: 'FAILED',
        failureReason: reason,
        similarityScore: null,
        livenessStatus: 'FAILED',
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
        success: false,
        reason: reason,
        logHash,
      });
      setStep('RESULT');
    } catch (error) {
      console.error(error);
      setAuthResult({
        success: false,
        reason: reason,
      });
      setStep('RESULT');
    }
  };

  const resetAll = () => {
    setEmployeeId('');
    setAuthResult(null);
    setStep('ID_INPUT');
  };

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

      {step === 'LIVE_SCANNING' ? (
        <LiveScannerPanel
          employeeId={employeeId}
          onLivenessComplete={runFaceMatching}
          onLivenessFailed={handleLivenessFailed}
          onCancel={() => setStep('ID_INPUT')}
        />
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
    width: '100%',
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
  primaryAction: {
    marginTop: spacing.lg,
  },
  section: {
    marginTop: spacing.xl,
  },
});
