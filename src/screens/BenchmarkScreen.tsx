import React, {useEffect, useMemo, useState} from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  benchmarkEmbeddingSpeed,
  benchmarkMatchingPipeline,
  type BenchmarkResult,
} from '../ai/benchmark';
import {
  runModelLoadValidation,
  summarizePhysicalValidation,
  validatePhysicalCapture,
  type CaptureScenario,
  type ModelLoadValidationResult,
  type PhysicalCaptureValidationResult,
} from '../ai/physicalMlValidation';
import {AppHeader} from '../components/AppHeader';
import {CameraCaptureCard} from '../components/CameraCaptureCard';
import {PrimaryButton} from '../components/PrimaryButton';
import {ScreenContainer} from '../components/ScreenContainer';
import {StatusBadge} from '../components/StatusBadge';
import {deviceInfoService, type DeviceProfile} from '../services/device/deviceInfo';
import type {CapturedFaceImage} from '../types/CameraTypes';

const SCENARIOS: Array<{id: CaptureScenario; label: string}> = [
  {id: 'neutral', label: 'Neutral'},
  {id: 'blink', label: 'Blink'},
  {id: 'head-turn', label: 'Head turn'},
];

function formatMs(value?: number): string {
  return value === undefined ? 'n/a' : `${value.toFixed(0)} ms`;
}

function formatScore(value?: number): string {
  return value === undefined ? 'n/a' : value.toFixed(3);
}

export function BenchmarkScreen(): React.JSX.Element {
  const [deviceProfile, setDeviceProfile] = useState<DeviceProfile | null>(
    null,
  );
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [isRunningSynthetic, setIsRunningSynthetic] = useState(false);
  const [isCheckingModels, setIsCheckingModels] = useState(false);
  const [isValidatingCapture, setIsValidatingCapture] = useState(false);
  const [activeScenario, setActiveScenario] =
    useState<CaptureScenario>('neutral');
  const [capturedImage, setCapturedImage] = useState<CapturedFaceImage | null>(
    null,
  );
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [modelLoadResults, setModelLoadResults] = useState<
    ModelLoadValidationResult[] | null
  >(null);
  const [captureResults, setCaptureResults] = useState<
    PhysicalCaptureValidationResult[]
  >([]);
  const [embeddingResult, setEmbeddingResult] =
    useState<BenchmarkResult | null>(null);
  const [pipelineResult, setPipelineResult] = useState<BenchmarkResult | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;
    deviceInfoService
      .getDeviceProfile()
      .then(profile => {
        if (isMounted) {
          setDeviceProfile(profile);
        }
      })
      .catch(error => {
        if (isMounted) {
          setDeviceError(
            error instanceof Error
              ? error.message
              : 'Unable to load device profile',
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const thresholdSummary = useMemo(
    () => summarizePhysicalValidation(captureResults),
    [captureResults],
  );

  const modelLoadStatus =
    modelLoadResults && modelLoadResults.every(result => result.status === 'PASS')
      ? 'success'
      : modelLoadResults
        ? 'error'
        : 'info';

  const runModelChecks = async () => {
    setIsCheckingModels(true);
    try {
      const results = await runModelLoadValidation();
      setModelLoadResults(results);
    } finally {
      setIsCheckingModels(false);
    }
  };

  const validateCapture = async () => {
    if (!capturedImage) {
      setCaptureError('Capture a camera image first.');
      return;
    }

    setCaptureError(null);
    setIsValidatingCapture(true);
    try {
      const result = await validatePhysicalCapture(
        capturedImage,
        activeScenario,
      );
      setCaptureResults(current => [result, ...current]);
      if (result.status === 'FAIL') {
        setCaptureError(result.errors.join(' ') || 'Validation failed.');
      }
    } catch (error) {
      setCaptureError(
        error instanceof Error ? error.message : 'Unable to validate capture.',
      );
    } finally {
      setIsValidatingCapture(false);
    }
  };

  const startSyntheticBenchmark = async () => {
    setIsRunningSynthetic(true);
    setEmbeddingResult(null);
    setPipelineResult(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      const embRes = await benchmarkEmbeddingSpeed(20);
      setEmbeddingResult(embRes);

      const pipeRes = await benchmarkMatchingPipeline(20);
      setPipelineResult(pipeRes);
    } catch (error) {
      console.error('[BenchmarkScreen] Error running benchmarks:', error);
    } finally {
      setIsRunningSynthetic(false);
    }
  };

  return (
    <ScreenContainer contentContainerStyle={styles.container}>
      <AppHeader
        title="Device ML Validation"
        subtitle="Run release-device checks for model loading, real capture latency, and threshold tuning."
        statusLabel="Physical device"
        status="info"
      />

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Device Profile</Text>
          <StatusBadge
            compact
            label={deviceProfile ? 'Loaded' : 'Pending'}
            status={deviceProfile ? 'success' : 'info'}
          />
        </View>
        {deviceProfile ? (
          <View style={styles.cardBody}>
            <Text style={styles.deviceValue}>
              {deviceInfoService.formatDeviceLabel(deviceProfile)}
            </Text>
            <Text style={styles.meta}>
              {deviceProfile.isAndroid
                ? `Android ${deviceProfile.osVersion} | SDK ${
                    deviceProfile.androidSdkVersion ?? 'unknown'
                  }`
                : `${deviceProfile.platform} ${deviceProfile.osVersion}`}
            </Text>
            <Text style={styles.meta}>ID: {deviceProfile.deviceId}</Text>
          </View>
        ) : (
          <Text style={styles.meta}>
            {deviceError ?? 'Loading device profile...'}
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Release Model Loading</Text>
          <StatusBadge
            compact
            label={
              modelLoadResults
                ? modelLoadStatus === 'success'
                  ? 'Passed'
                  : 'Failed'
                : 'Not run'
            }
            status={modelLoadStatus}
          />
        </View>
        <Text style={styles.cardExplanation}>
          Confirms the bundled MobileFaceNet and MiniFASNet TFLite assets load
          through react-native-fast-tflite.
        </Text>
        <View style={styles.actionRow}>
          <PrimaryButton
            icon="chart"
            title={isCheckingModels ? 'Checking...' : 'Check TFLite Models'}
            loading={isCheckingModels}
            onPress={runModelChecks}
          />
        </View>
        {modelLoadResults ? (
          <View style={styles.checkList}>
            {modelLoadResults.map(result => (
              <CheckRow
                key={result.modelName}
                label={result.modelName}
                status={result.status}
                value={formatMs(result.latencyMs)}
                detail={result.error ?? result.modelPath}
              />
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Real Capture Samples</Text>
        <Text style={styles.sectionText}>
          Save one sample for each scenario on a release build, then compare
          threshold candidates below.
        </Text>
      </View>
      <View style={styles.scenarioRow}>
        {SCENARIOS.map(scenario => {
          const selected = scenario.id === activeScenario;
          return (
            <TouchableOpacity
              key={scenario.id}
              onPress={() => setActiveScenario(scenario.id)}
              style={[
                styles.scenarioButton,
                selected && styles.scenarioButtonSelected,
              ]}
            >
              <Text
                style={[
                  styles.scenarioText,
                  selected && styles.scenarioTextSelected,
                ]}
              >
                {scenario.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <CameraCaptureCard
        title={`${SCENARIOS.find(scenario => scenario.id === activeScenario)?.label ?? 'Sample'} Capture`}
        description="Use a real camera capture from the physical device."
        onPhotoCaptured={image => {
          setCapturedImage(image);
          setCaptureError(null);
        }}
        onPhotoCleared={() => {
          setCapturedImage(null);
          setCaptureError(null);
        }}
        validationMessages={[
          'Exactly one face',
          'Release build',
          'Real capture only',
        ]}
      />

      <View style={styles.actionRow}>
        <PrimaryButton
          icon="shield"
          title={isValidatingCapture ? 'Analyzing...' : 'Analyze Capture'}
          loading={isValidatingCapture}
          onPress={validateCapture}
        />
      </View>
      {captureError ? (
        <View style={styles.messageBlock}>
          <StatusBadge label={captureError} status="error" />
        </View>
      ) : null}

      {captureResults.length > 0 ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Capture Results</Text>
            <StatusBadge
              compact
              label={`${captureResults.length} sample(s)`}
              status="info"
            />
          </View>
          {captureResults.map(result => (
            <CaptureResultCard key={`${result.scenario}-${result.capturedAt}`} result={result} />
          ))}
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Threshold Candidates</Text>
          <StatusBadge
            compact
            label={`${thresholdSummary.sampleCount} valid`}
            status={thresholdSummary.sampleCount > 0 ? 'success' : 'info'}
          />
        </View>
        <View style={styles.metricGrid}>
          <MetricRow
            label="Blink eye-open"
            value={formatScore(thresholdSummary.suggestedBlinkEyeOpenClosed)}
          />
          <MetricRow
            label="Blink EAR"
            value={formatScore(thresholdSummary.suggestedBlinkEarClosed)}
          />
          <MetricRow
            label="Head rotation"
            value={
              thresholdSummary.suggestedHeadTurnRotationDegrees === undefined
                ? 'n/a'
                : `${thresholdSummary.suggestedHeadTurnRotationDegrees.toFixed(1)} deg`
            }
          />
          <MetricRow
            label="Yaw right/left"
            value={`${formatScore(
              thresholdSummary.suggestedHeadTurnRightYawRatio,
            )} / ${formatScore(thresholdSummary.suggestedHeadTurnLeftYawRatio)}`}
          />
        </View>
        {thresholdSummary.notes.map(note => (
          <Text key={note} style={styles.noteText}>
            {note}
          </Text>
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Synthetic Stress Benchmark</Text>
          <StatusBadge compact label="Mock path" status="warning" />
        </View>
        <Text style={styles.cardExplanation}>
          This benchmark is useful for regressions, but physical capture
          results above are the source for release threshold tuning.
        </Text>
        <View style={styles.actionRow}>
          <PrimaryButton
            icon="chart"
            title={
              isRunningSynthetic ? 'Running...' : 'Run Synthetic Stress Test'
            }
            loading={isRunningSynthetic}
            onPress={startSyntheticBenchmark}
          />
        </View>
      </View>

      {embeddingResult ? (
        <BenchmarkResultCard
          title="MobileFaceNet Embedding Generation"
          result={embeddingResult}
        />
      ) : null}

      {pipelineResult ? (
        <BenchmarkResultCard
          title="Full Matching Pipeline"
          result={pipelineResult}
        />
      ) : null}
    </ScreenContainer>
  );
}

function CheckRow({
  detail,
  label,
  status,
  value,
}: {
  detail?: string;
  label: string;
  status: 'PASS' | 'FAIL';
  value: string;
}): React.JSX.Element {
  return (
    <View style={styles.checkRow}>
      <View style={styles.checkMain}>
        <Text style={styles.checkLabel}>{label}</Text>
        {detail ? <Text style={styles.checkDetail}>{detail}</Text> : null}
      </View>
      <View style={styles.checkAside}>
        <StatusBadge
          compact
          label={status === 'PASS' ? 'PASS' : 'FAIL'}
          status={status === 'PASS' ? 'success' : 'error'}
        />
        <Text style={styles.checkValue}>{value}</Text>
      </View>
    </View>
  );
}

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function CaptureResultCard({
  result,
}: {
  result: PhysicalCaptureValidationResult;
}): React.JSX.Element {
  return (
    <View style={styles.resultBlock}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>{result.scenario.toUpperCase()}</Text>
        <StatusBadge
          compact
          label={result.status}
          status={result.status === 'PASS' ? 'success' : 'error'}
        />
      </View>
      <View style={styles.metricGrid}>
        <MetricRow label="Total" value={formatMs(result.totalLatencyMs)} />
        <MetricRow label="Detection" value={formatMs(result.detection.latencyMs)} />
        <MetricRow label="Embedding" value={formatMs(result.embedding?.latencyMs)} />
        <MetricRow label="MiniFAS" value={formatMs(result.antiSpoof?.latencyMs)} />
      </View>
      <View style={styles.metricGrid}>
        <MetricRow label="Faces" value={String(result.detection.faceCount)} />
        <MetricRow
          label="Eye open"
          value={formatScore(result.livenessMetrics?.avgEyeOpen)}
        />
        <MetricRow label="EAR" value={formatScore(result.livenessMetrics?.ear)} />
        <MetricRow
          label="Yaw/rot"
          value={`${formatScore(result.livenessMetrics?.yawRatio)} / ${
            result.livenessMetrics?.rotationY?.toFixed(1) ?? 'n/a'
          }`}
        />
      </View>
      {result.antiSpoof ? (
        <Text style={styles.noteText}>
          MiniFAS label {result.antiSpoof.label}, live score{' '}
          {result.antiSpoof.liveScore.toFixed(3)}
        </Text>
      ) : null}
      {result.errors.map(error => (
        <Text key={error} style={styles.errorText}>
          {error}
        </Text>
      ))}
    </View>
  );
}

function BenchmarkResultCard({
  result,
  title,
}: {
  result: BenchmarkResult;
  title: string;
}): React.JSX.Element {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <StatusBadge
          compact
          label={result.passedTarget ? 'COMPLIANT' : 'NON-COMPLIANT'}
          status={result.passedTarget ? 'success' : 'error'}
        />
      </View>
      <View style={styles.metricGrid}>
        <MetricRow label="Avg latency" value={`${result.averageTimeMs.toFixed(2)} ms`} />
        <MetricRow label="Min/max" value={`${result.minTimeMs}/${result.maxTimeMs} ms`} />
        <MetricRow label="Pass rate" value={`${result.passRate.toFixed(1)}%`} />
        <MetricRow label="Runs" value={String(result.totalRuns)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    marginTop: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  cardBody: {
    marginTop: 4,
  },
  cardExplanation: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 12,
  },
  cardHeader: {
    alignItems: 'center',
    borderBottomColor: '#f1f5f9',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  cardTitle: {
    color: '#0f172a',
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    marginRight: 8,
  },
  checkAside: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  checkDetail: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  checkLabel: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '800',
  },
  checkList: {
    marginTop: 12,
  },
  checkMain: {
    flex: 1,
  },
  checkRow: {
    alignItems: 'flex-start',
    borderBottomColor: '#f1f5f9',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 10,
  },
  checkValue: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  container: {
    paddingBottom: 32,
  },
  deviceValue: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 4,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  messageBlock: {
    marginTop: 12,
  },
  meta: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
  },
  metricBox: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    marginRight: 8,
    minHeight: 58,
    padding: 8,
  },
  metricGrid: {
    flexDirection: 'row',
    marginTop: 12,
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  noteText: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  resultBlock: {
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  resultHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resultTitle: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '800',
  },
  scenarioButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    marginRight: 8,
    paddingHorizontal: 8,
  },
  scenarioButtonSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#0f4cbd',
  },
  scenarioRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  scenarioText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  scenarioTextSelected: {
    color: '#0f4cbd',
  },
  sectionHeader: {
    marginTop: 20,
  },
  sectionText: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
});
