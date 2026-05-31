import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

export type BadgeStatus = 'success' | 'warning' | 'error' | 'info';

type StatusBadgeProps = {
  label: string;
  status: BadgeStatus;
};

const STATUS_STYLES: Record<
  BadgeStatus,
  {backgroundColor: string; color: string}
> = {
  success: {backgroundColor: '#dcfce7', color: '#166534'},
  warning: {backgroundColor: '#fef3c7', color: '#92400e'},
  error: {backgroundColor: '#fee2e2', color: '#991b1b'},
  info: {backgroundColor: '#dbeafe', color: '#1e40af'},
};

export function StatusBadge({
  label,
  status,
}: StatusBadgeProps): React.JSX.Element {
  const statusStyle = STATUS_STYLES[status];

  return (
    <View
      style={[styles.badge, {backgroundColor: statusStyle.backgroundColor}]}
    >
      <Text style={[styles.label, {color: statusStyle.color}]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
});
