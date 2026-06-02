import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {ScreenContainer} from '../components/ScreenContainer';
import {deviceInfoService} from '../services/device/deviceInfo';
import type {DeviceProfile} from '../services/device/deviceInfo';

const BENCHMARK_ITEMS = [
  'Face Detection Time',
  'Embedding Time',
  'Liveness Time',
  'Total Authentication Time',
] as const;

export function BenchmarkScreen(): React.JSX.Element {
  const [deviceProfile, setDeviceProfile] = useState<DeviceProfile | null>(
    null,
  );
  const [deviceError, setDeviceError] = useState<string | null>(null);

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

  return (
    <ScreenContainer>
      <View style={styles.card}>
        <Text style={styles.label}>Device</Text>
        {deviceProfile ? (
          <>
            <Text style={styles.value}>
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
          </>
        ) : (
          <Text style={styles.value}>
            {deviceError ?? 'Loading device profile...'}
          </Text>
        )}
      </View>

      {BENCHMARK_ITEMS.map(item => (
        <View key={item} style={styles.card}>
          <Text style={styles.label}>{item}</Text>
          <Text style={styles.value}>Not measured</Text>
        </View>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  label: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
  },
  value: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
  },
});
