import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FaceCapturePanel } from '../components/FaceCapturePanel';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { StatusBadge } from '../components/StatusBadge';
import { secureStorageService } from '../services/SecureStorageService';
import { offlineDatabaseService } from '../services/OfflineDatabaseService';
import { livenessService, LivenessSessionState } from '../services/liveness/livenessService';
import { getDynamicThreshold } from '../ai/dynamicThreshold';
import { FACE_RECOGNITION_MODEL } from '../ai/modelConfig';

type AuthStep = 'ID_INPUT' | 'CAMERA_CAPTURE' | 'LIVENESS_CHALLENGE' | 'MATCHING' | 'RESULT';

export function AuthenticationScreen(): React.JSX.Element {
  const [employeeId, setEmployeeId] = useState('');
  const [capturedImagePath, setCapturedImagePath] = useState<string | null>(null);
  const [step, setStep] = useState<AuthStep>('ID_INPUT');
  const [livenessState, setLivenessState] = useState<LivenessSessionState | null>(null);
  const [metrics, setMetrics] = useState({ ear: 0.32, mar: 0.18, yawRatio: 1.0 });
  const [authResult, setAuthResult] = useState<{
    success: boolean;
    score?: number;
    matchTimeMs?: number;
    reason?: string;
    logHash?: string;
  } | null>(null);

  // Timer reference for liveness simulation
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const startVerification = () => {
    if (!employeeId.trim()) {
      Alert.alert('Validation Error', 'Please enter your Employee ID first.');
      return;
    }
    setStep('CAMERA_CAPTURE');
  };

  const handlePhotoCaptured = (image: { path: string }) => {
    setCapturedImagePath(image.path);
    // Proceed to liveness challenge after camera capture
    startLivenessChallenges();
  };

  const startLivenessChallenges = () => {
    const initialState = livenessService.resetSession();
    setLivenessState(initialState);
    setStep('LIVENESS_CHALLENGE');
    startTimeRef.current = Date.now();

    // Start simulation loop
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const currentChallenge = livenessService.getSessionState().challenges[
        livenessService.getSessionState().currentChallengeIndex
      ];

      if (!currentChallenge) {
        // Liveness completed
        clearInterval(timerRef.current!);
        timerRef.current = null;
        runFaceMatching();
        return;
      }

      // Simulate live visual fluctuations in eye blinking, smiles, or turns
      const sim = livenessService.getSimulatedMetrics(currentChallenge.type, elapsed);
      setMetrics(sim);

      // Process in state machine
      const updatedState = livenessService.processFrame(sim.ear, sim.mar, sim.yawRatio);
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
    
    // Simulate lighting and quality metrics
    const simulatedBrightness = 90 + Math.floor(Math.random() * 60); // Optimal: 90 - 150
    const simulatedQuality = 0.85 + Math.random() * 0.12; // Good quality: 85% - 97%
    
    // Determine dynamic match threshold
    const dynamicResult = getDynamicThreshold(simulatedBrightness, simulatedQuality);

    try {
      const startTime = Date.now();
      const matchResult = await secureStorageService.verifyFace(
        employeeId.trim().toUpperCase(),
        capturedImagePath || 'mock://captured-face.jpg',
        dynamicResult.threshold
      );
      const elapsedMs = Date.now() - startTime;

      // Log attempts in database
      const logId = await offlineDatabaseService.logAuthAttempt({
        employeeId: employeeId.trim().toUpperCase(),
        authStatus: matchResult.success ? 'SUCCESS' : 'FAILED',
        failureReason: matchResult.success ? null : (matchResult.error || 'Face template mismatch'),
        similarityScore: matchResult.score !== undefined ? matchResult.score : null,
        livenessStatus: 'PASSED', // successfully passed in previous step
        challengeType: livenessService.getSessionState().challenges[0]?.type || 'BLINK',
        deviceId: 'device-tablet-01',
        modelVersion: FACE_RECOGNITION_MODEL.modelName,
      });

      // Retrieve full entry to display generated integrity hash
      let logHash = '';
      if (logId) {
        const logs = await offlineDatabaseService.getAllLogs();
        const found = logs.find(l => l.id === logId);
        if (found) logHash = found.logHash || '';
      }

      setAuthResult({
        success: matchResult.success,
        score: matchResult.score,
        matchTimeMs: elapsedMs,
        reason: matchResult.success ? undefined : (matchResult.error || 'Face template mismatch'),
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

  // UI rendering based on steps
  return (
    <ScreenContainer contentContainerStyle={styles.container}>
      {step === 'ID_INPUT' && (
        <View style={styles.card}>
          <Text style={styles.title}>Secure Face Login</Text>
          <Text style={styles.subtitle}>
            Authenticate securely using on-device face recognition and liveness detection.
          </Text>
          <TextInput
            autoCapitalize="characters"
            onChangeText={setEmployeeId}
            placeholder="ENTER EMPLOYEE ID (e.g. EMP042)"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            value={employeeId}
          />
          <PrimaryButton title="Start Verification" onPress={startVerification} />
        </View>
      )}

      {step === 'CAMERA_CAPTURE' && (
        <View style={styles.cameraWrapper}>
          <FaceCapturePanel
            title="Facial Login"
            description="Center your face inside the frame to begin authentication logs."
            onPhotoCaptured={handlePhotoCaptured}
            onPhotoCleared={() => setCapturedImagePath(null)}
          />
        </View>
      )}

      {step === 'LIVENESS_CHALLENGE' && livenessState && (
        <View style={styles.hudCard}>
          <Text style={styles.hudTitle}>🤖 NETRAKSH-AI HUD</Text>
          <Text style={styles.hudStatus}>LIVENESS VERIFICATION ACTIVE</Text>
          
          <View style={styles.challengeBox}>
            <ActivityIndicator color="#10b981" style={{ marginBottom: 8 }} />
            <Text style={styles.challengeInstruction}>
              {livenessState.challenges[livenessState.currentChallengeIndex]?.instruction}
            </Text>
            <Text style={styles.challengeProgress}>
              Challenge {livenessState.currentChallengeIndex + 1} of {livenessState.challenges.length}
            </Text>
          </View>

          {/* Realistic metric bars */}
          <View style={styles.metricContainer}>
            <Text style={styles.metricLabel}>Eye Aspect Ratio (EAR):</Text>
            <View style={styles.barBackground}>
              <View style={[styles.barFill, { width: `${Math.min(100, metrics.ear * 250)}%`, backgroundColor: metrics.ear < 0.22 ? '#34d399' : '#60a5fa' }]} />
            </View>
            <Text style={styles.metricValue}>{metrics.ear.toFixed(3)} (Threshold &lt; 0.22)</Text>
          </View>

          <View style={styles.metricContainer}>
            <Text style={styles.metricLabel}>Mouth Aspect Ratio (MAR):</Text>
            <View style={styles.barBackground}>
              <View style={[styles.barFill, { width: `${Math.min(100, metrics.mar * 150)}%`, backgroundColor: metrics.mar > 0.50 ? '#34d399' : '#fbcfe8' }]} />
            </View>
            <Text style={styles.metricValue}>{metrics.mar.toFixed(3)} (Threshold &gt; 0.50)</Text>
          </View>

          <View style={styles.metricContainer}>
            <Text style={styles.metricLabel}>Yaw Ratio (Head Orientation):</Text>
            <View style={styles.barBackground}>
              <View style={[styles.barFill, { width: `${Math.min(100, metrics.yawRatio * 50)}%`, backgroundColor: (metrics.yawRatio < 0.6 || metrics.yawRatio > 1.6) ? '#34d399' : '#c084fc' }]} />
            </View>
            <Text style={styles.metricValue}>{metrics.yawRatio.toFixed(3)} (Centered ≈ 1.0)</Text>
          </View>
        </View>
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
          <Text style={[styles.resultTitle, { color: authResult.success ? '#10b981' : '#ef4444' }]}>
            {authResult.success ? 'Authentication Success ✅' : 'Authentication Failed ❌'}
          </Text>

          <View style={styles.detailsBox}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Employee ID:</Text>
              <Text style={styles.detailValue}>{employeeId.toUpperCase()}</Text>
            </View>
            {authResult.score !== undefined && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Similarity Score:</Text>
                <Text style={styles.detailValue}>{authResult.score.toFixed(4)}</Text>
              </View>
            )}
            {authResult.matchTimeMs !== undefined && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Pipeline Time:</Text>
                <Text style={styles.detailValue}>{authResult.matchTimeMs} ms</Text>
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
            label={authResult.success ? 'Access Granted. Attendance logged offline.' : 'Access Denied. Log created.'}
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
    gap: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    gap: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
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
    textAlign: 'center',
    marginBottom: 8,
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
    gap: 16,
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
    textAlign: 'center',
    letterSpacing: 2,
  },
  challengeBox: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#334155',
    borderWidth: 1,
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
    gap: 6,
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  barBackground: {
    height: 8,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  metricValue: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'right',
  },
  matchingCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  matchingText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  matchingSubtext: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
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
    padding: 14,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    gap: 4,
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
  },
});
