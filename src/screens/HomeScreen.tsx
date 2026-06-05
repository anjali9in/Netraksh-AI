import React, {useEffect, useState} from 'react';
import {Alert, StyleSheet, Text, View} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useNavigation} from '@react-navigation/native';

import {AppHeader} from '../components/AppHeader';
import {InfoCard} from '../components/InfoCard';
import {PrimaryButton} from '../components/PrimaryButton';
import {ScreenContainer} from '../components/ScreenContainer';
import {StatusBadge} from '../components/StatusBadge';
import {RootStackParamList, ROUTES} from '../app/navigation/routes';
import {
  offlineDatabaseService,
  AuthLogEntry,
} from '../services/OfflineDatabaseService';
import {useNetworkStatus} from '../hooks/useNetworkStatus';
import {colors} from '../theme/colors';
import {radius, spacing} from '../theme/spacing';

type AppNavigation = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<AppNavigation>();
  const [logs, setLogs] = useState<AuthLogEntry[]>([]);
  const {isOnline, isChecking: isCheckingNetwork, connectionType} =
    useNetworkStatus();

  const pendingLogs = logs.filter(log => log.syncStatus === 'PENDING').length;
  const successfulAuth = logs.filter(
    log => log.authStatus === 'SUCCESS',
  ).length;
  const failedAuth = logs.filter(log => log.authStatus === 'FAILED').length;

  const fetchLogs = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const allLogs = await offlineDatabaseService.getAllLogs();
      setLogs(allLogs);
    } catch (error) {
      console.warn('Could not load attendance logs:', error);
      setLogs([]);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <ScreenContainer contentContainerStyle={styles.screenContent}>
        <AppHeader
          title="Offline Face Authentication"
          subtitle="Enterprise-grade employee enrollment, liveness checks, and local attendance logs."
          statusLabel={
            isCheckingNetwork
              ? 'Checking network...'
              : isOnline
              ? pendingLogs > 0
                ? `Online | ${pendingLogs} log(s) pending sync`
                : `Online | ${connectionType}`
              : 'No internet | offline mode active'
          }
          status={
            isCheckingNetwork
              ? 'info'
              : isOnline
              ? pendingLogs > 0
                ? 'warning'
                : 'success'
              : 'error'
          }
        />

        <View style={styles.systemPanel}>
          <View style={styles.systemCopy}>
            <Text style={styles.systemTitle}>Security Operations</Text>
            <Text style={styles.systemText}>
              Local MobileFaceNet matching remains available during poor connectivity.
            </Text>
          </View>
          <StatusBadge
            label={
              isCheckingNetwork
                ? 'Checking network'
                : isOnline
                ? 'Online'
                : 'Offline'
            }
            status={
              isCheckingNetwork ? 'info' : isOnline ? 'success' : 'error'
            }
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
