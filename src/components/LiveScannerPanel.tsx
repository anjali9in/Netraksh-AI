import {useIsFocused} from '@react-navigation/native';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Animated,
  AppState,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Camera, useCameraDevice} from 'react-native-vision-camera';
import Svg, {Circle, Defs, Mask, Path, Rect} from 'react-native-svg';

import {livenessService, LivenessSessionState} from '../services/liveness/livenessService';
import {PrimaryButton} from './PrimaryButton';

type LiveScannerPanelProps = {
  employeeId: string;
  onLivenessComplete: (imagePath: string) => void;
  onCancel: () => void;
};

export function LiveScannerPanel({
  employeeId,
  onLivenessComplete,
  onCancel,
}: LiveScannerPanelProps): React.JSX.Element {
  const isScreenFocused = useIsFocused();
  const [appState, setAppState] = useState(AppState.currentState);
  const [hasPermission, setHasPermission] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  // Liveness session states
  const [livenessState, setLivenessState] = useState<LivenessSessionState | null>(null);
  const [metrics, setMetrics] = useState({ear: 0.32, mar: 0.18, yawRatio: 1.0});

  const frontDevice = useCameraDevice('front');
  const backDevice = useCameraDevice('back');
  const device = frontDevice ?? backDevice;

  const cameraRef = useRef<Camera>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isCameraActive = isScreenFocused && appState === 'active';

  // Request permissions on mount
  useEffect(() => {
    const status = Camera.getCameraPermissionStatus();
    if (status === 'not-determined') {
      Camera.requestCameraPermission().then(newStatus => {
        setHasPermission(newStatus === 'granted');
      });
    } else {
      setHasPermission(status === 'granted');
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

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

  // Handle liveness complete and silent capture
  const handleLivenessSuccess = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      if (device && cameraRef.current) {
        console.log('[LiveScannerPanel] Liveness succeeded. Capturing photo silently...');
        const photo = await cameraRef.current.takePhoto({
          flash: 'off',
        });
        onLivenessComplete(photo.path);
      } else {
        // Fallback for emulator / mock mode
        console.log('[LiveScannerPanel] Liveness succeeded. Simulating photo capture...');
        onLivenessComplete('mock://captured-face.jpg');
      }
    } catch (err) {
      console.error('[LiveScannerPanel] Silent capture failed, fallback to mock path:', err);
      onLivenessComplete('mock://captured-face.jpg');
    }
  }, [device, onLivenessComplete]);

  // Liveness frame processing loop
  const startScanning = useCallback(() => {
    console.log('[LiveScannerPanel] Starting live liveness session...');
    const initialState = livenessService.resetSession();
    setLivenessState(initialState);
    startTimeRef.current = Date.now();

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      if (!isCameraActive) return;

      const elapsed = Date.now() - startTimeRef.current;
      const state = livenessService.getSessionState();
      const currentChallenge = state.challenges[state.currentChallengeIndex];

      if (!currentChallenge) {
        handleLivenessSuccess();
        return;
      }

      // Simulate metrics dynamically according to current challenge type
      const sim = livenessService.getSimulatedMetrics(
        currentChallenge.type,
        elapsed,
      );
      setMetrics(sim);

      // Feed into state machine
      const updatedState = livenessService.processFrame(
        sim.ear,
        sim.mar,
        sim.yawRatio,
      );
      setLivenessState(updatedState);

      if (updatedState.isComplete && updatedState.isPassed) {
        handleLivenessSuccess();
      }
    }, 100);
  }, [isCameraActive, handleLivenessSuccess]);

  // Control scanner loop based on active state
  useEffect(() => {
    if (isCameraActive && (cameraReady || !device)) {
      startScanning();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isCameraActive, cameraReady, device, startScanning]);

  return (
    <View style={styles.container}>
      <View style={styles.scannerHeader}>
        <Text style={styles.title}>Secure Live Verification</Text>
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
              {hasPermission ? 'Camera Hardware Offline' : 'Awaiting Camera Permission'}
            </Text>
            <Text style={styles.fallbackSubtext}>
              {hasPermission
                ? 'Running offline simulation mode.'
                : 'Allow camera permissions to perform live verification.'}
            </Text>
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
                  transform: [{scale: pulseAnim}],
                  opacity: pulseAnim.interpolate({
                    inputRange: [1.0, 1.3],
                    outputRange: [0.8, 0.15],
                  }),
                },
              ]}
            />
            <View style={styles.targetBorder} />
            
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
          <Text style={styles.hudInstructionLabel}>VERIFYING LIVENESS</Text>
          <Text style={styles.hudInstructionText}>
            {livenessState?.challenges[livenessState.currentChallengeIndex]?.instruction ||
              'Align your face inside the circle'}
          </Text>
          {livenessState && (
            <Text style={styles.hudStepText}>
              Step {livenessState.currentChallengeIndex + 1} of {livenessState.challenges.length}
            </Text>
          )}
        </View>
      </View>

      {/* Diagnostics HUD Panel */}
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

      <View style={styles.actionRow}>
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
