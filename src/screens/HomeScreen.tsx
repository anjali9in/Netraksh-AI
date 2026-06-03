import React, {useEffect, useState} from 'react';
import {Alert, StyleSheet, Text, View} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useNavigation} from '@react-navigation/native';

import {AppHeader} from '../components/AppHeader';
import {InfoCard} from '../components/InfoCard';
import {PrimaryButton} from '../components/PrimaryButton';
import {ProfileDrawer} from '../components/ProfileDrawer';
import {ScreenContainer} from '../components/ScreenContainer';
import {StatusBadge} from '../components/StatusBadge';
import {RootStackParamList, ROUTES} from '../app/navigation/routes';
import {
  offlineDatabaseService,
  AuthLogEntry,
} from '../services/OfflineDatabaseService';
import type {User} from '../types/UserTypes';
import {colors} from '../theme/colors';
import {radius, spacing} from '../theme/spacing';

type HomeNavigation = NativeStackNavigationProp<
  RootStackParamList,
  typeof ROUTES.HOME
>;

const DEMO_USER: User = {
  employeeId: 'EMP-001',
  fullName: 'Demo User',
  department: 'Engineering',
  designation: 'Software Engineer',
  email: 'demo@netraksh.ai',
  phone: '+91 98765 43210',
  siteId: 'HQ-Bangalore',
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  syncStatus: 'SYNCED',
};

export function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<HomeNavigation>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [logs, setLogs] = useState<AuthLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const pendingLogs = logs.filter(log => log.syncStatus === 'PENDING').length;
  const successfulAuth = logs.filter(
    log => log.authStatus === 'SUCCESS',
  ).length;
  const failedAuth = logs.filter(log => log.authStatus === 'FAILED').length;

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      const allLogs = await offlineDatabaseService.getAllLogs();
      setLogs(allLogs);
    } catch (error) {
      console.warn('Could not load attendance logs:', error);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <>
      <ScreenContainer contentContainerStyle={styles.screenContent}>
        <AppHeader
          title="Offline Face Authentication"
          subtitle="Enterprise-grade employee enrollment, liveness checks, and local attendance logs."
          statusLabel={
            pendingLogs > 0
              ? `${pendingLogs} logs pending sync`
              : 'Offline-ready | encrypted local store'
          }
          status={pendingLogs > 0 ? 'warning' : 'info'}
          onProfilePress={() => setDrawerVisible(true)}
        />

        <View style={styles.systemPanel}>
          <View style={styles.systemCopy}>
            <Text style={styles.systemTitle}>Security Operations</Text>
            <Text style={styles.systemText}>
              Local ArcFace matching remains available during poor connectivity.
            </Text>
          </View>
          <StatusBadge
            label={isLoading ? 'Checking logs' : 'Offline mode active'}
            status={isLoading ? 'info' : 'success'}
          />
        </View>

        <View style={styles.metricGrid}>
          <View style={[styles.metricCard, styles.metricCardSpacing]}>
            <Text style={styles.metricValue}>{logs.length}</Text>
            <Text style={styles.metricLabel}>Local logs</Text>
          </View>
          <View style={[styles.metricCard, styles.metricCardSpacing]}>
            <Text style={styles.metricValue}>{successfulAuth}</Text>
            <Text style={styles.metricLabel}>Verified</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{failedAuth}</Text>
            <Text style={styles.metricLabel}>Denied</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <InfoCard
            title="Enroll User"
            subtitle="Create encrypted local face template for a new employee."
            style={styles.actionCard}
          >
            <PrimaryButton
              icon="userPlus"
              title="Start Enrollment"
              onPress={() => navigation.navigate(ROUTES.ENROLLMENT)}
            />
          </InfoCard>

          <InfoCard
            title="Authenticate User"
            subtitle="Run offline face match with liveness challenge and logging."
            style={styles.actionCard}
          >
            <PrimaryButton
              icon="shield"
              title="Authenticate"
              onPress={() => navigation.navigate(ROUTES.AUTHENTICATION)}
            />
          </InfoCard>

          <InfoCard
            title="Offline Logs"
            subtitle="Inspect tamper-evident attendance and verification records."
            style={styles.actionCard}
          >
            <PrimaryButton
              icon="logs"
              title="View Offline Logs"
              onPress={() => navigation.navigate(ROUTES.OFFLINE_LOGS)}
              variant="secondary"
            />
          </InfoCard>

          <InfoCard
            title="Benchmark Report"
            subtitle="Review model performance, thresholds, and demo metrics."
            style={styles.actionCard}
          >
            <PrimaryButton
              icon="chart"
              title="View Benchmark Report"
              onPress={() => navigation.navigate(ROUTES.BENCHMARK)}
              variant="secondary"
            />
          </InfoCard>

          <InfoCard
            title="Sync Pending Data"
            subtitle={
              pendingLogs > 0
                ? `${pendingLogs} log records are waiting for AWS sync.`
                : 'No pending records. Local and cloud state are aligned.'
            }
          >
            <PrimaryButton
              icon="refresh"
              title="Check Sync Queue"
              onPress={() =>
                Alert.alert(
                  'Sync Queue',
                  pendingLogs > 0
                    ? `${pendingLogs} records will sync when the network is restored.`
                    : 'No pending records found.',
                )
              }
              variant={pendingLogs > 0 ? 'primary' : 'secondary'}
            />
          </InfoCard>
        </View>
      </ScreenContainer>

      <ProfileDrawer
        logs={logs}
        onClose={() => setDrawerVisible(false)}
        user={DEMO_USER}
        visible={drawerVisible}
      />
    </>
  );
}

const styles = StyleSheet.create({
  actionCard: {
    marginBottom: spacing.md,
  },
  actions: {
    marginTop: spacing.xl,
  },
  metricCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    padding: spacing.md,
  },
  metricCardSpacing: {
    marginRight: spacing.sm,
  },
  metricGrid: {
    flexDirection: 'row',
    marginTop: spacing.xl,
  },
  metricLabel: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  metricValue: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '800',
  },
  screenContent: {
    backgroundColor: colors.background,
    minHeight: '100%',
    paddingBottom: spacing.xxxl,
  },
  systemCopy: {
    flex: 1,
    paddingRight: spacing.md,
  },
  systemPanel: {
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: spacing.xl,
    padding: spacing.lg,
  },
  systemText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  systemTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
});
