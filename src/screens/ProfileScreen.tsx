import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {AppHeader} from '../components/AppHeader';
import {AttendanceCalendar} from '../components/AttendanceCalendar';
import {InfoCard} from '../components/InfoCard';
import {ScreenContainer} from '../components/ScreenContainer';
import {StatusBadge} from '../components/StatusBadge';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';

export function ProfileScreen(): React.JSX.Element {
  return (
    <ScreenContainer contentContainerStyle={styles.container}>
      <AppHeader
        title="My Profile"
        subtitle="Offline user profile, attendance, and sync status."
        statusLabel="Demo profile"
        status="info"
      />

      <InfoCard title="Personal Information" style={styles.section}>
        <InfoRow label="Employee ID" value="EMP-001" />
        <InfoRow label="Department" value="Engineering" />
        <InfoRow label="Designation" value="Software Engineer" />
        <InfoRow label="Site" value="HQ-Bangalore" />
      </InfoCard>

      <InfoCard title="Attendance" style={styles.section}>
        <AttendanceCalendar logs={[]} />
      </InfoCard>

      <InfoCard title="Sync Status" style={styles.section}>
        <StatusBadge label="No pending offline records" status="success" />
      </InfoCard>
    </ScreenContainer>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    minHeight: '100%',
    paddingBottom: spacing.xxxl,
  },
  label: {
    color: colors.textSubtle,
    fontSize: 13,
    fontWeight: '800',
  },
  row: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  section: {
    marginTop: spacing.xl,
  },
  value: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
});
