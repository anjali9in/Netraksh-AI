import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import {StatusBadge} from './StatusBadge';

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  statusLabel?: string;
  status?: 'success' | 'warning' | 'error' | 'info';
};

/** Screen-level heading shown below the global AppBar. */
export function AppHeader({
  title,
  subtitle,
  statusLabel,
  status = 'info',
}: AppHeaderProps): React.JSX.Element {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {statusLabel ? (
        <View style={styles.status}>
          <StatusBadge compact label={statusLabel} status={status} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.sm,
  },
  status: {
    marginTop: spacing.md,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
});
