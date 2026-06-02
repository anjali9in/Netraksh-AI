import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ScreenContainer } from '../components/ScreenContainer';
import { StatusBadge } from '../components/StatusBadge';
import { benchmarkEmbeddingSpeed, benchmarkMatchingPipeline, BenchmarkResult } from '../ai/benchmark';
import { deviceInfoService } from '../services/device/deviceInfo';
import type { DeviceProfile } from '../services/device/deviceInfo';

export function BenchmarkScreen(): React.JSX.Element {
  const [deviceProfile, setDeviceProfile] = useState<DeviceProfile | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [embeddingResult, setEmbeddingResult] = useState<BenchmarkResult | null>(null);
  const [pipelineResult, setPipelineResult] = useState<BenchmarkResult | null>(null);

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

  const startBenchmark = async () => {
    setIsRunning(true);
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
      setIsRunning(false);
    }
  };

  return (
    <ScreenContainer contentContainerStyle={styles.container}>
      {/* Device Info Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Device Profile</Text>
        </View>
        {deviceProfile ? (
          <View style={{ marginTop: 4 }}>
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

      <View style={styles.headerCard}>
        <Text style={styles.title}>Model Speed Performance</Text>
        <Text style={styles.subtitle}>
          Benchmark the on-device AI models. Complies with the Hackathon target of less than 1.0 second total auth latency.
        </Text>
        
        {isRunning ? (
          <View style={styles.runningBox}>
            <ActivityIndicator color="#6366f1" size="small" />
            <Text style={styles.runningText}>Executing AI stress tests (40 inference passes)...</Text>
          </View>
        ) : (
          <TouchableOpacity onPress={startBenchmark} style={styles.runBtn}>
            <Text style={styles.runBtnText}>Run Benchmark Stress Test</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Embedding Benchmark Card */}
      {embeddingResult ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>1. ArcFace Embedding Generation</Text>
            <StatusBadge
              label={embeddingResult.passedTarget ? 'COMPLIANT' : 'NON-COMPLIANT'}
              status={embeddingResult.passedTarget ? 'success' : 'error'}
            />
          </View>
          
          <Text style={styles.cardExplanation}>
            Measures the time to load the photo, normalize the pixel array, run TFLite INT8 inference, and output a normalized 512-dim unit vector.
          </Text>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Avg Latency</Text>
              <Text style={[styles.statVal, { color: '#4f46e5' }]}>
                {embeddingResult.averageTimeMs.toFixed(2)} ms
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Min / Max</Text>
              <Text style={styles.statVal}>
                {embeddingResult.minTimeMs}ms / {embeddingResult.maxTimeMs}ms
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Pass Rate (&lt;1s)</Text>
              <Text style={[styles.statVal, { color: '#10b981' }]}>
                {embeddingResult.passRate.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Full Matching Pipeline Benchmark Card */}
      {pipelineResult ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>2. Full Authentication Pipeline</Text>
            <StatusBadge
              label={pipelineResult.passedTarget ? 'COMPLIANT' : 'NON-COMPLIANT'}
              status={pipelineResult.passedTarget ? 'success' : 'error'}
            />
          </View>

          <Text style={styles.cardExplanation}>
            Measures the total latency: Generating the current face embedding, loading the enrolled template from SQLite, and calculating the cosine similarity.
          </Text>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Avg Latency</Text>
              <Text style={[styles.statVal, { color: '#4f46e5' }]}>
                {pipelineResult.averageTimeMs.toFixed(2)} ms
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Min / Max</Text>
              <Text style={styles.statVal}>
                {pipelineResult.minTimeMs}ms / {pipelineResult.maxTimeMs}ms
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Pass Rate (&lt;1s)</Text>
              <Text style={[styles.statVal, { color: '#10b981' }]}>
                {pipelineResult.passRate.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {!embeddingResult && !isRunning && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Benchmarks not run yet</Text>
          <Text style={styles.emptySubtext}>Tap the button above to begin speed tests.</Text>
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
  headerCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
  },
  runBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  runBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  runningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 8,
    height: 48,
    marginTop: 4,
  },
  runningText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomColor: '#f1f5f9',
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardExplanation: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  statLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statVal: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 180,
    padding: 24,
    gap: 4,
  },
  emptyText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '700',
  },
  emptySubtext: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
  },
  meta: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
  },
  deviceValue: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 4,
  },
});
