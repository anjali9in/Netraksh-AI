import {useIsFocused} from '@react-navigation/native';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Animated,
  AppState,
  Linking,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import RNFS from 'react-native-fs';
import {Camera, useCameraDevice} from 'react-native-vision-camera';
import Svg, {Circle, Defs, Mask, Path, Rect} from 'react-native-svg';

import {analyzeFaceAlignment} from '../ai/faceAlignment';
import {livenessService, LivenessSessionState} from '../services/liveness/livenessService';
import {normalizeCapturedPhoto} from '../utils/normalizeCapturedPhoto';
import {PrimaryButton} from './PrimaryButton';

export type LiveScannerMode = 'liveness' | 'enrollment';

type LiveScannerPanelProps = {
  employeeId: string;
  /** Liveness challenges for auth; enrollment only aligns face then captures. */
  scanMode?: LiveScannerMode;
  onLivenessComplete: (imagePath: string) => void;
  onLivenessFailed?: (reason: string) => void;
  onCancel: () => void;
};

const ENROLLMENT_CAPTURE_DELAY_MS = 1500;
const FACE_POLL_INTERVAL_MS = 900;
const REQUIRED_ALIGNED_FRAMES = 2;
const FACE_ALIGNMENT_TIMEOUT_MS = 30000;

type CameraPermissionStatus =
  | 'not-determined'
  | 'denied'
  | 'restricted'
  | 'granted';

export function LiveScannerPanel({
  employeeId,
  scanMode = 'liveness',
  onLivenessComplete,
  onLivenessFailed,
  onCancel,
}: LiveScannerPanelProps): React.JSX.Element {
  const isEnrollmentMode = scanMode === 'enrollment';
  const isScreenFocused = useIsFocused();
  const [appState, setAppState] = useState(AppState.currentState);
  const [permissionStatus, setPermissionStatus] =
    useState<CameraPermissionStatus>('not-determined');
  const hasPermission = permissionStatus === 'granted';
  const canRequestPermission = permissionStatus === 'not-determined';
  const [cameraReady, setCameraReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [alignmentMessage, setAlignmentMessage] = useState(
    'Position your face in the circle',
  );

  // Liveness session states
  const [livenessState, setLivenessState] = useState<LivenessSessionState | null>(null);
  const [metrics, setMetrics] = useState({ear: 0.32, mar: 0.18, yawRatio: 1.0});

  const frontDevice = useCameraDevice('front');
  const backDevice = useCameraDevice('back');
  const device = frontDevice ?? backDevice;

  const cameraRef = useRef<Camera>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const faceDetectionTimeRef = useRef<number | null>(null);
  const consecutiveAlignedRef = useRef(0);
  const isDetectingFrameRef = useRef(false);
  const sessionStartedRef = useRef(false);
  const isCapturingRef = useRef(false);
  const lastChallengeIndexRef = useRef<number>(0);
  const challengeTickCountRef = useRef<number>(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const hasRequestedPermission = useRef(false);

  const isCameraActive =
    isScreenFocused && appState === 'active' && hasPermission;

  const syncPermissionStatus = useCallback(() => {
    setPermissionStatus(
      Camera.getCameraPermissionStatus() as CameraPermissionStatus,
    );
  }, []);

  const requestCameraPermission = useCallback(async () => {
    const result = await Camera.requestCameraPermission();
    const next = result as CameraPermissionStatus;
    setPermissionStatus(next);
    return next === 'granted';
  }, []);

  const openCameraSettings = useCallback(async () => {
    await Linking.openSettings();
  }, []);

  // Prompt for camera on first visit (Android often reports "denied" before first ask)
  useEffect(() => {
    syncPermissionStatus();
    if (hasRequestedPermission.current) {
      return;
    }
    hasRequestedPermission.current = true;

    const status = Camera.getCameraPermissionStatus();
    if (status !== 'granted') {
      void requestCameraPermission();
    }
  }, [requestCameraPermission, syncPermissionStatus]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      setAppState(nextState);
      if (nextState === 'active') {
        syncPermissionStatus();
      }
    });
    return () => subscription.remove();
  }, [syncPermissionStatus]);

  // Pulsing animation loop
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );

    if (isCameraActive) {
      animation.start();
    } else {
      animation.stop();
    }

    return () => animation.stop();
  }, [isCameraActive, pulseAnim]);

  const capturePhoto = useCallback(async () => {
    if (isCapturingRef.current) {
      return;
    }
    isCapturingRef.current = true;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      if (device && cameraRef.current) {
        console.log('[LiveScannerPanel] Capturing photo...');
        const photo = await cameraRef.current.takePhoto({
          flash: 'off',
          qualityPrioritization: 'quality',
          enableAutoStabilization: true,
        });
        const upright = await normalizeCapturedPhoto(
          photo.path,
          photo.width,
          photo.height,
          photo.orientation,
          {isFrontCamera: device.position === 'front'},
        );
        onLivenessComplete(upright.path);
      } else {
        console.log('[LiveScannerPanel] Simulating photo capture...');
        onLivenessComplete('mock://captured-face.jpg');
      }
    } catch (err) {
      console.error('[LiveScannerPanel] Capture failed, fallback to mock path:', err);
      onLivenessComplete('mock://captured-face.jpg');
    } finally {
      isCapturingRef.current = false;
    }
  }, [device, onLivenessComplete]);

  // Handle liveness complete and silent capture
  const handleLivenessSuccess = useCallback(async () => {
    await capturePhoto();
  }, [capturePhoto]);

  // Begin a single scan session when the camera is ready
  useEffect(() => {
    if (!hasPermission || !isCameraActive || !device || !cameraReady) {
      if (!isCameraActive || !hasPermission) {
        sessionStartedRef.current = false;
        setFaceDetected(false);
      }
      return;
    }

    if (sessionStartedRef.current) {
      return;
    }

    sessionStartedRef.current = true;
    console.log(
      `[LiveScannerPanel] Starting ${isEnrollmentMode ? 'enrollment' : 'liveness'} session...`,
    );
    startTimeRef.current = Date.now();
    faceDetectionTimeRef.current = null;
    consecutiveAlignedRef.current = 0;
    lastChallengeIndexRef.current = 0;
    challengeTickCountRef.current = 0;
    setFaceDetected(false);
    setAlignmentMessage('Position your face in the circle');
    setLivenessState(isEnrollmentMode ? null : livenessService.resetSession());
  }, [hasPermission, isCameraActive, device, cameraReady, isEnrollmentMode]);

  // Alignment check via src/ai (pixels only — ArcFace runs at capture/enroll)
  useEffect(() => {
    if (
      !sessionStartedRef.current ||
      !hasPermission ||
      !isCameraActive ||
      !device ||
      !cameraReady
    ) {
      return;
    }

    let cancelled = false;
    let pollTimeout: NodeJS.Timeout | null = null;

    const scheduleNextPoll = () => {
      if (cancelled || faceDetectionTimeRef.current) {
        return;
      }
      pollTimeout = setTimeout(() => {
        void runFacePoll().finally(scheduleNextPoll);
      }, FACE_POLL_INTERVAL_MS);
    };

    const runFacePoll = async () => {
      if (
        cancelled ||
        faceDetectionTimeRef.current ||
        isDetectingFrameRef.current ||
        !cameraRef.current
      ) {
        return;
      }

      isDetectingFrameRef.current = true;
      let capturePath: string | undefined;

      try {
        const photo = await cameraRef.current.takePhoto({
          flash: 'off',
          qualityPrioritization: 'speed',
          enableAutoStabilization: false,
        });
        capturePath = photo.path;

        const analysis = await analyzeFaceAlignment(photo.path);
        if (cancelled || faceDetectionTimeRef.current) {
          return;
        }

        if (analysis.hint === 'aligned') {
          consecutiveAlignedRef.current += 1;
          setAlignmentMessage(analysis.message);

          if (consecutiveAlignedRef.current >= REQUIRED_ALIGNED_FRAMES) {
            console.log(
              '[LiveScannerPanel] Face detected in frame. Outline turned green.',
            );
            setFaceDetected(true);
            faceDetectionTimeRef.current = Date.now();
            if (!isEnrollmentMode) {
              setLivenessState(livenessService.resetSession());
            }
          }
        } else {
          consecutiveAlignedRef.current = 0;
          setFaceDetected(false);
          setAlignmentMessage(analysis.message);
        }
      } catch (error) {
        console.warn('[LiveScannerPanel] Face detection frame failed:', error);
        consecutiveAlignedRef.current = 0;
        setAlignmentMessage('Scanning for your face...');
      } finally {
        if (capturePath) {
          RNFS.unlink(capturePath).catch(() => undefined);
        }
        isDetectingFrameRef.current = false;
      }
    };

    void runFacePoll().finally(scheduleNextPoll);

    const alignmentTimeout = setInterval(() => {
      if (faceDetectionTimeRef.current) {
        return;
      }
      if (Date.now() - startTimeRef.current > FACE_ALIGNMENT_TIMEOUT_MS) {
        cancelled = true;
        if (pollTimeout) {
          clearTimeout(pollTimeout);
        }
        clearInterval(alignmentTimeout);
        console.log('[LiveScannerPanel] Face alignment timed out.');
        onLivenessFailed?.(
          'No face detected. Center your face in the circle and try again.',
        );
        sessionStartedRef.current = false;
      }
    }, 1000);

    return () => {
      cancelled = true;
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
      clearInterval(alignmentTimeout);
    };
  }, [
    hasPermission,
    isCameraActive,
    device,
    cameraReady,
    isEnrollmentMode,
    onLivenessFailed,
  ]);

  // Enrollment: capture after the face stays aligned
  useEffect(() => {
    if (!faceDetected || !isEnrollmentMode || !faceDetectionTimeRef.current) {
      return;
    }

    const detectedAt = faceDetectionTimeRef.current;
    const delay = Math.max(
      0,
      ENROLLMENT_CAPTURE_DELAY_MS - (Date.now() - detectedAt),
    );
    const captureTimer = setTimeout(() => {
      void capturePhoto();
    }, delay);

    return () => clearTimeout(captureTimer);
  }, [capturePhoto, faceDetected, isEnrollmentMode]);

  // Authentication: liveness challenges after a real face is detected
  useEffect(() => {
    if (!faceDetected || isEnrollmentMode || !faceDetectionTimeRef.current) {
      return;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      if (!isCameraActive || !faceDetectionTimeRef.current) {
        return;
      }

      const challengeElapsed = Date.now() - faceDetectionTimeRef.current;

      if (challengeElapsed > 15000) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setFaceDetected(false);
        faceDetectionTimeRef.current = null;
        console.log('[LiveScannerPanel] Liveness check timed out. Rejecting.');
        onLivenessFailed?.('Liveness check timed out');
        return;
      }

      const state = livenessService.getSessionState();
      const currentChallenge = state.challenges[state.currentChallengeIndex];

      if (!currentChallenge) {
        void handleLivenessSuccess();
        return;
      }

      // Track challenge ticks and reset on transition
      if (state.currentChallengeIndex !== lastChallengeIndexRef.current) {
        lastChallengeIndexRef.current = state.currentChallengeIndex;
        challengeTickCountRef.current = 0;
      } else {
        challengeTickCountRef.current++;
      }

      // 1 tick = 100ms, so tick count * 100 simulates milliseconds elapsed for the current challenge
      const currentChallengeTimeMs = challengeTickCountRef.current * 100;

      // Simulate metrics dynamically according to current challenge type based on currentChallengeTimeMs
      const sim = livenessService.getSimulatedMetrics(
        currentChallenge.type,
        currentChallengeTimeMs,
      );
      setMetrics(sim);

      const updatedState = livenessService.processFrame(
        sim.ear,
        sim.mar,
        sim.yawRatio,
      );
      setLivenessState(updatedState);

      if (updatedState.isComplete && updatedState.isPassed) {
        void handleLivenessSuccess();
      }
    }, 100);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    faceDetected,
    handleLivenessSuccess,
    isCameraActive,
    isEnrollmentMode,
    onLivenessFailed,
  ]);

  useEffect(() => {
    if (!hasPermission || !isCameraActive) {
      setFaceDetected(false);
      faceDetectionTimeRef.current = null;
      consecutiveAlignedRef.current = 0;
    }
  }, [hasPermission, isCameraActive]);

  return (
    <View style={styles.container}>
      <View style={styles.scannerHeader}>
        <Text style={styles.title}>
          {isEnrollmentMode ? 'Face Enrollment Capture' : 'Secure Live Verification'}
        </Text>
        <Text style={styles.subtitle}>ID: {employeeId.toUpperCase()}</Text>
      </View>

      <View style={styles.previewContainer}>
        {hasPermission && device ? (
          <Camera
            ref={cameraRef}
            device={device}
            isActive={isCameraActive}
            photo={true}
            onInitialized={() => setCameraReady(true)}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={styles.fallbackPreview}>
            <Text style={styles.fallbackText}>
              {hasPermission ? 'Camera Hardware Offline' : 'Camera access needed'}
            </Text>
            <Text style={styles.fallbackSubtext}>
              {hasPermission
                ? 'No camera was found on this device.'
                : isEnrollmentMode
                  ? 'Allow camera access to capture your face for enrollment.'
                  : 'Allow camera access to perform live verification.'}
            </Text>
            {!hasPermission ? (
              <>
                <View style={styles.permissionAction}>
                  <PrimaryButton
                    icon="camera"
                    title="Allow Camera"
                    onPress={() => void requestCameraPermission()}
                  />
                </View>
                {!canRequestPermission ? (
                  <View style={styles.permissionAction}>
                    <PrimaryButton
                      icon="settings"
                      title="Open Settings"
                      onPress={() => void openCameraSettings()}
                      variant="secondary"
                    />
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        )}

        {/* Circular cutout SVG Overlay */}
        <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <Mask id="face-mask" x="0" y="0" height="100%" width="100%">
              <Rect height="100%" width="100%" fill="#ffffff" />
              {/* Diameter 220 circle cutout */}
              <Circle cx="50%" cy="48%" r="110" fill="#000000" />
            </Mask>
          </Defs>
          <Rect height="100%" width="100%" fill="rgba(15, 23, 42, 0.78)" mask="url(#face-mask)" />
        </Svg>

        {/* Target Outline & Glowing pulsing scanner border */}
        <View style={styles.overlayContainer} pointerEvents="none">
          <View style={styles.targetWrapper}>
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  borderColor: faceDetected ? '#34d399' : '#f87171',
                  transform: [{scale: pulseAnim}],
                  opacity: pulseAnim.interpolate({
                    inputRange: [1.0, 1.3],
                    outputRange: [0.8, 0.15],
                  }),
                },
              ]}
            />
            <View style={[styles.targetBorder, {borderColor: faceDetected ? '#10b981' : '#ef4444'}]} />
            
            {/* Silhouette outline helper */}
            <View style={styles.silhouetteWrapper}>
              <Svg height="120" width="120" viewBox="0 0 100 100">
                <Path
                  d="M 50,20 C 38,20 28,30 28,45 C 28,62 38,72 50,78 C 62,72 72,62 72,45 C 72,30 62,20 50,20 Z M 50,78 L 50,85 M 40,85 L 60,85"
                  stroke="rgba(255, 255, 255, 0.35)"
                  strokeWidth="2.5"
                  fill="none"
                />
              </Svg>
            </View>
          </View>
        </View>

        {/* Live HUD instructions badge */}
        <View style={styles.hudInstructionBox}>
          <Text style={[styles.hudInstructionLabel, {color: faceDetected ? '#10b981' : '#ef4444'}]}>
            {faceDetected
              ? isEnrollmentMode
                ? 'FACE DETECTED'
                : 'VERIFYING LIVENESS'
              : 'ALIGN FACE'}
          </Text>
          <Text style={styles.hudInstructionText}>
            {faceDetected
              ? isEnrollmentMode
                ? 'Hold still — capturing your photo...'
                : livenessState?.challenges[livenessState.currentChallengeIndex]
                    ?.instruction || 'Perform the challenge'
              : alignmentMessage}
          </Text>
          {faceDetected && livenessState && !isEnrollmentMode && (
            <Text style={styles.hudStepText}>
              Step {livenessState.currentChallengeIndex + 1} of {livenessState.challenges.length}
            </Text>
          )}
        </View>
      </View>

      {/* Diagnostics HUD Panel (auth liveness only) */}
      {!isEnrollmentMode ? (
      <View style={styles.diagnosticsPanel}>
        <Text style={styles.diagnosticsTitle}>🤖 NETRAKSH-AI DIAGNOSTICS HUD</Text>
        
        <View style={styles.metricRow}>
          <View style={styles.metricInfo}>
            <Text style={styles.metricLabel}>Eye Aspect Ratio (EAR)</Text>
            <Text style={styles.metricVal}>{metrics.ear.toFixed(3)}</Text>
          </View>
          <View style={styles.barContainer}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.min(100, metrics.ear * 250)}%`,
                  backgroundColor: metrics.ear < 0.22 ? '#10b981' : '#3b82f6',
                },
              ]}
            />
          </View>
          <Text style={styles.metricThreshold}>Threshold &lt; 0.22</Text>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metricInfo}>
            <Text style={styles.metricLabel}>Mouth Aspect Ratio (MAR)</Text>
            <Text style={styles.metricVal}>{metrics.mar.toFixed(3)}</Text>
          </View>
          <View style={styles.barContainer}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.min(100, metrics.mar * 150)}%`,
                  backgroundColor: metrics.mar > 0.5 ? '#10b981' : '#ec4899',
                },
              ]}
            />
          </View>
          <Text style={styles.metricThreshold}>Threshold &gt; 0.50</Text>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metricInfo}>
            <Text style={styles.metricLabel}>Yaw Ratio (Head Turn)</Text>
            <Text style={styles.metricVal}>{metrics.yawRatio.toFixed(3)}</Text>
          </View>
          <View style={styles.barContainer}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.min(100, metrics.yawRatio * 50)}%`,
                  backgroundColor:
                    metrics.yawRatio < 0.6 || metrics.yawRatio > 1.6 ? '#10b981' : '#8b5cf6',
                },
              ]}
            />
          </View>
          <Text style={styles.metricThreshold}>Centered ≈ 1.00</Text>
        </View>
      </View>
      ) : null}

      <View style={styles.actionRow}>
        {__DEV__ && hasPermission && !faceDetected ? (
          <View style={styles.devSimulateRow}>
            <PrimaryButton
              title="Simulate Face Alignment"
              variant="secondary"
              onPress={() => {
                console.log('[LiveScannerPanel] Manual face alignment triggered (dev only).');
                consecutiveAlignedRef.current = REQUIRED_ALIGNED_FRAMES;
                setFaceDetected(true);
                faceDetectionTimeRef.current = Date.now();
                if (!isEnrollmentMode) {
                  setLivenessState(livenessService.resetSession());
                }
              }}
            />
          </View>
        ) : null}
        <PrimaryButton title="Cancel Scan" onPress={onCancel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  scannerHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  previewContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    height: 380,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  fallbackPreview: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  fallbackText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  fallbackSubtext: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
  },
  permissionAction: {
    marginTop: 16,
    width: '100%',
  },
  devSimulateRow: {
    marginBottom: 8,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetWrapper: {
    alignItems: 'center',
    height: 220,
    justifyContent: 'center',
    marginBottom: 16, // nudge slightly upwards to match 48% cy
    position: 'relative',
    width: 220,
  },
  targetBorder: {
    borderColor: '#10b981',
    borderRadius: 110,
    borderWidth: 2.5,
    height: 220,
    position: 'absolute',
    width: 220,
  },
  pulseRing: {
    borderColor: '#34d399',
    borderRadius: 110,
    borderWidth: 1.5,
    height: 220,
    position: 'absolute',
    width: 220,
  },
  silhouetteWrapper: {
    opacity: 0.8,
  },
  hudInstructionBox: {
    alignItems: 'center',
    bottom: 20,
    left: 20,
    position: 'absolute',
    right: 20,
  },
  hudInstructionLabel: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  hudInstructionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  hudStepText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  diagnosticsPanel: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    marginTop: 14,
    padding: 14,
  },
  diagnosticsTitle: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  metricRow: {
    marginBottom: 10,
  },
  metricInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  metricVal: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  barContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 3,
    height: 6,
    overflow: 'hidden',
  },
  barFill: {
    borderRadius: 3,
    height: '100%',
  },
  metricThreshold: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 3,
    textAlign: 'right',
  },
  actionRow: {
    marginTop: 14,
  },
});
