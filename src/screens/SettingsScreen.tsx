import React, {useEffect, useState} from 'react';
import {Alert, Linking, Platform, StyleSheet, Text, View} from 'react-native';

import {AppHeader} from '../components/AppHeader';
import {InfoCard} from '../components/InfoCard';
import {PrimaryButton} from '../components/PrimaryButton';
import {ScreenContainer} from '../components/ScreenContainer';
import {StatusBadge} from '../components/StatusBadge';
import {APP_NAME, DEMO_MODE, MODEL_VERSION} from '../config/appConfig';
import {useNetworkStatus} from '../hooks/useNetworkStatus';
import {
  deviceInfoService,
  type DeviceProfile,
} from '../services/device/deviceInfo';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';

export function SettingsScreen(): React.JSX.Element {
  const {isOnline, isChecking, connectionType} = useNetworkStatus();
  const [deviceProfile, setDeviceProfile] = useState<DeviceProfile | null>(
    null,
  );

  useEffect(() => {
    deviceInfoService
      .getDeviceProfile()
      .then(setDeviceProfile)
      .catch(() => setDeviceProfile(null));
  }, []);

  const openSystemSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert(
        'Unable to open settings',
        'Open your device Settings app manually to manage permissions.',
      );
    }
  };

  return (
    <ScreenContainer contentContainerStyle={styles.container}>
      <AppHeader
        title="Settings"
        subtitle="App configuration, device details, and system permissions."
        statusLabel={isChecking ? 'Checking network...' : isOnline ? 'Online' : 'Offline'}
        status={isChecking ? 'info' : isOnline ? 'success' : 'error'}
      />

      <InfoCard title="Application" style={styles.section}>
        <SettingRow label="App name" value={APP_NAME} />
        <SettingRow label="Model version" value={MODEL_VERSION} />
        <SettingRow
          label="Face recognition"
          value={DEMO_MODE ? 'Demo mode' : 'ArcFace (on-device)'}
        />
        <SettingRow label="Platform" value={`${Platform.OS} ${Platform.Version}`} />
      </InfoCard>

      <InfoCard title="Network" style={styles.section}>
        <View style={styles.badgeRow}>
          <StatusBadge
            compact
            label={
              isChecking
                ? 'Checking...'
                : isOnline
                ? `Online (${connectionType})`
                : 'Offline'
            }
            status={isChecking ? 'info' : isOnline ? 'success' : 'error'}
          />
        </View>
        <Text style={styles.hint}>
          Pending auth logs sync automatically when the device reconnects.
        </Text>
      </InfoCard>

      <InfoCard title="Device" style={styles.section}>
        {deviceProfile ? (
          <>
            <SettingRow label="Device ID" value={deviceProfile.deviceId} />
            <SettingRow
              label="Manufacturer"
              value={deviceProfile.manufacturer ?? deviceProfile.brand ?? '—'}
            />
            <SettingRow label="Model" value={deviceProfile.model ?? '—'} />
            <SettingRow label="OS" value={deviceProfile.osVersion} />
          </>
        ) : (
          <Text style={styles.hint}>Device information is not available.</Text>
        )}
      </InfoCard>

      <InfoCard title="Permissions" style={styles.section}>
        <Text style={styles.hint}>
          Manage camera, location, and notification permissions in system
          settings.
        </Text>
        <PrimaryButton
          icon="settings"
          title="Open System Settings"
          onPress={openSystemSettings}
          variant="secondary"
        />
      </InfoCard>
    </ScreenContainer>
  );
}

function SettingRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text ellipsizeMode="tail" numberOfLines={2} style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeRow: {
    marginBottom: spacing.sm,
  },
  container: {
    backgroundColor: colors.background,
    minHeight: '100%',
    paddingBottom: spacing.xxxl,
  },
  hint: {
    color: colors.textSubtle,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  label: {
    color: colors.textSubtle,
    flex: 0.42,
    fontSize: 13,
    fontWeight: '800',
  },
  row: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: spacing.md,
  },
  section: {
    marginTop: spacing.xl,
  },
  value: {
    color: colors.text,
    flex: 0.58,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
});
