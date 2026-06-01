import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {ScreenContainer} from '../components/ScreenContainer';

const BENCHMARK_ITEMS = [
  'Face Detection Time',
  'Embedding Time',
  'Liveness Time',
  'Total Authentication Time',
] as const;

export function BenchmarkScreen(): React.JSX.Element {
  return (
    <ScreenContainer>
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
  value: {
    color: '#64748b',
    fontSize: 14,
  },
});
