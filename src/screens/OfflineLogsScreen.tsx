import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {ScreenContainer} from '../components/ScreenContainer';

export function OfflineLogsScreen(): React.JSX.Element {
  return (
    <ScreenContainer contentContainerStyle={styles.content}>
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No offline logs available</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 180,
    padding: 24,
  },
  emptyText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },
});
