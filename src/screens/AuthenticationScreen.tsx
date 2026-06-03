import React, {useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {LiveScannerPanel} from '../components/LiveScannerPanel';
import {PrimaryButton} from '../components/PrimaryButton';
import {ScreenContainer} from '../components/ScreenContainer';
import {StatusBadge} from '../components/StatusBadge';
import {secureStorageService} from '../services/SecureStorageService';
import {offlineDatabaseService} from '../services/OfflineDatabaseService';
import {livenessService} from '../services/liveness/livenessService';
import {getDynamicThreshold} from '../ai/dynamicThreshold';
import {FACE_RECOGNITION_MODEL} from '../ai/modelConfig';

type AuthStep = 'ID_INPUT' | 'LIVE_SCANNING' | 'MATCHING' | 'RESULT';

export function AuthenticationScreen(): React.JSX.Element {
  const [employeeId, setEmployeeId] = useState('');
  const [capturedImagePath, setCapturedImagePath] = useState<string | null>(
    null,
  );
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
    setCapturedImagePath(imagePath);

    // Simulate lighting and quality metrics
    const simulatedBrightness = 90 + Math.floor(Math.random() * 60); // Optimal: 90 - 150
    const simulatedQuality = 0.85 + Math.random() * 0.12; // Good quality: 85% - 97%

    // Determine dynamic match threshold
    const dynamicResult = getDynamicThreshold(
      simulatedBrightness,
      simulatedQuality,
    );

    try {
      const startTime = Date.now();
      const matchResult = await secureStorageService.verifyFace(
        employeeId.trim().toUpperCase(),
        imagePath || 'mock://captured-face.jpg',
        dynamicResult.threshold,
      );
      const elapsedMs = Date.now() - startTime;

      // Log attempts in database
      const logId = await offlineDatabaseService.logAuthAttempt({
        employeeId: employeeId.trim().toUpperCase(),
        authStatus: matchResult.success ? 'SUCCESS' : 'FAILED',
        failureReason: matchResult.success
          ? null
          : matchResult.error || 'Face template mismatch',
        similarityScore:
          matchResult.score !== undefined ? matchResult.score : null,
        livenessStatus: 'PASSED', // successfully passed in previous step
        challengeType:
          livenessService.getSessionState().challenges[0]?.type || 'BLINK',
        deviceId: 'device-tablet-01',
        modelVersion: FACE_RECOGNITION_MODEL.modelName,
      });

      // Retrieve full entry to display generated integrity hash
      let logHash = '';
      if (logId) {
        const logs = await offlineDatabaseService.getAllLogs();
        const found = logs.find(l => l.id === logId);
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
    setStep('ID_INPUT');
  };

  // UI rendering based on steps
  return (
    <ScreenContainer contentContainerStyle={styles.container}>
      {step === 'ID_INPUT' && (
        <View style={styles.card}>
          <Text style={styles.title}>Secure Face Login</Text>
          <Text style={styles.subtitle}>
            Authenticate securely using on-device face recognition and liveness
            detection.
          </Text>
          <TextInput
            autoCapitalize="characters"
            onChangeText={setEmployeeId}
            placeholder="ENTER EMPLOYEE ID (e.g. EMP042)"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            value={employeeId}
          />
          <PrimaryButton
            title="Start Verification"
            onPress={startVerification}
          />
        </View>
      )}

      {step === 'LIVE_SCANNING' && (
        <LiveScannerPanel
          employeeId={employeeId}
          onLivenessComplete={runFaceMatching}
          onCancel={() => setStep('ID_INPUT')}
        />
      )}

      {step === 'MATCHING' && (
        <View style={styles.matchingCard}>
          <ActivityIndicator color="#6366f1" size="large" />
          <Text style={styles.matchingText}>Verifying Face Embeddings...</Text>
          <Text style={styles.matchingSubtext}>
            Matching 512-dim face landmarks against offline database templates.
          </Text>
        </View>
      )}

      {step === 'RESULT' && authResult && (
        <View style={styles.card}>
          <Text
            style={[
              styles.resultTitle,
              {color: authResult.success ? '#10b981' : '#ef4444'},
            ]}
          >
            {authResult.success
              ? 'Authentication Success ✅'
              : 'Authentication Failed ❌'}
          </Text>

          <View style={styles.detailsBox}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Employee ID:</Text>
              <Text style={styles.detailValue}>{employeeId.toUpperCase()}</Text>
            </View>
            {authResult.score !== undefined && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Similarity Score:</Text>
                <Text style={styles.detailValue}>
                  {authResult.score.toFixed(4)}
                </Text>
              </View>
            )}
            {authResult.matchTimeMs !== undefined && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Pipeline Time:</Text>
                <Text style={styles.detailValue}>
                  {authResult.matchTimeMs} ms
                </Text>
              </View>
            )}
            {authResult.reason && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Failure Reason:</Text>
                <Text style={styles.detailValue}>{authResult.reason}</Text>
              </View>
            )}
            {authResult.logHash ? (
              <View style={styles.hashBox}>
                <Text style={styles.hashLabel}>Integrity Hash (SHA-256):</Text>
                <Text style={styles.hashText} numberOfLines={2}>
                  {authResult.logHash}
                </Text>
              </View>
            ) : null}
          </View>

          <StatusBadge
            label={
              authResult.success
                ? 'Access Granted. Attendance logged offline.'
                : 'Access Denied. Log created.'
            }
            status={authResult.success ? 'success' : 'error'}
          />

          <PrimaryButton title="Done" onPress={resetAll} />
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    marginTop: 8,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
    minHeight: 48,
    marginBottom: 14,
    paddingHorizontal: 14,
    textAlign: 'center',
  },
  inputDisabled: {
    backgroundColor: '#e2e8f0',
    color: '#64748b',
  },
  cameraWrapper: {
    flex: 1,
  },
  hudCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 20,
  },
  hudTitle: {
    color: '#34d399',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  hudStatus: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 4,
    textAlign: 'center',
  },
  challengeBox: {
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderColor: '#334155',
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 16,
    padding: 16,
  },
  challengeInstruction: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  challengeProgress: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  metricContainer: {
    marginTop: 16,
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  barBackground: {
    backgroundColor: '#1e293b',
    borderRadius: 4,
    height: 8,
    marginTop: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  metricValue: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'right',
  },
  matchingCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    padding: 32,
  },
  matchingText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  matchingSubtext: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
    textAlign: 'center',
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  detailsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderColor: '#cbd5e1',
    borderWidth: 1,
    marginBottom: 14,
    marginTop: 14,
    padding: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailLabel: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  detailValue: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  hashBox: {
    borderTopColor: '#e2e8f0',
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 4,
  },
  hashLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  hashText: {
    color: '#475569',
    fontFamily: 'Courier',
    fontSize: 11,
    lineHeight: 14,
    marginTop: 4,
  },
});
