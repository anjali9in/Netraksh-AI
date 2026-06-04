import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {colors} from '../theme/colors';
import {radius, spacing} from '../theme/spacing';

export type BadgeStatus = 'success' | 'warning' | 'error' | 'info';

type StatusBadgeProps = {
  label: string;
  status: BadgeStatus;
  compact?: boolean;
};

const STATUS_STYLES: Record<
  BadgeStatus,
  {backgroundColor: string; color: string}
> = {
  success: {backgroundColor: colors.successBg, color: colors.success},
  warning: {backgroundColor: colors.warningBg, color: colors.warning},
  error: {backgroundColor: colors.errorBg, color: colors.error},
  info: {backgroundColor: colors.infoBg, color: colors.info},
};

export function StatusBadge({
  label,
  status,
  compact = false,
}: StatusBadgeProps): React.JSX.Element {
  const statusStyle = STATUS_STYLES[status];

  return (
    <View
      style={[
        styles.badge,
        compact && styles.compact,
        {backgroundColor: statusStyle.backgroundColor},
      ]}
    >
      <View style={[styles.dot, {backgroundColor: statusStyle.color}]} />
      <Text style={[styles.label, {color: statusStyle.color}]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.round,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  compact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dot: {
    borderRadius: 3,
    height: 6,
    marginRight: spacing.sm,
    width: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
});
