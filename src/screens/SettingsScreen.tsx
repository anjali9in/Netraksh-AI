import React, {useEffect, useState} from 'react';
import {
  Alert,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {InfoCard} from '../components/InfoCard';
import {PrimaryButton} from '../components/PrimaryButton';
import {ScreenContainer} from '../components/ScreenContainer';
import {StatusBadge} from '../components/StatusBadge';
import {APP_NAME, DEMO_MODE, MODEL_VERSION} from '../config/appConfig';
import {API_SITE_ID, API_TENANT_ID} from '../config/env';
import {useNetworkStatus} from '../hooks/useNetworkStatus';
import {
  deviceInfoService,
  type DeviceProfile,
} from '../services/device/deviceInfo';
import {syncProvisioningService} from '../services/sync/syncProvisioningService';
import {colors} from '../theme/colors';
import {radius, spacing} from '../theme/spacing';

export function SettingsScreen(): React.JSX.Element {
  const {isOnline, isChecking, connectionType} = useNetworkStatus();
  const [deviceProfile, setDeviceProfile] = useState<DeviceProfile | null>(
    null,
  );
  const [hasSyncToken, setHasSyncToken] = useState(false);
  const [syncTokenInput, setSyncTokenInput] = useState('');
  const [isSavingSyncToken, setIsSavingSyncToken] = useState(false);

  useEffect(() => {
    deviceInfoService
      .getDeviceProfile()
      .then(setDeviceProfile)
      .catch(() => setDeviceProfile(null));

    syncProvisioningService
      .getSyncProvisioningStatus()
      .then(status => setHasSyncToken(status.hasSyncToken))
      .catch(() => setHasSyncToken(false));
  }, []);

  const saveSyncToken = async () => {
    setIsSavingSyncToken(true);
    try {
      await syncProvisioningService.saveSyncBearerToken(syncTokenInput);
      setHasSyncToken(true);
      setSyncTokenInput('');
      Alert.alert('Sync token saved', 'This device can submit sync batches.');
    } catch (error) {
      Alert.alert(
        'Unable to save token',
        error instanceof Error ? error.message : 'Check the token and try again.',
      );
    } finally {
      setIsSavingSyncToken(false);
    }
  };

  const clearSyncToken = async () => {
    await syncProvisioningService.clearSyncBearerToken();
    setHasSyncToken(false);
    setSyncTokenInput('');
    Alert.alert('Sync token cleared', 'This device will not sync until reprovisioned.');
  };

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
      <InfoCard title="Application" style={styles.firstSection}>
        <SettingRow label="App name" value={APP_NAME} />
        <SettingRow label="Model version" value={MODEL_VERSION} />
        <SettingRow
          label="Face recognition"
          value={DEMO_MODE ? 'Demo mode' : 'MobileFaceNet (on-device)'}
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

      <InfoCard title="Sync Provisioning" style={styles.section}>
        <SettingRow label="Tenant" value={API_TENANT_ID} />
        <SettingRow label="Site" value={API_SITE_ID} />
        <View style={styles.badgeRow}>
          <StatusBadge
            compact
            label={hasSyncToken ? 'Token provisioned' : 'Token missing'}
            status={hasSyncToken ? 'success' : 'warning'}
          />
        </View>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setSyncTokenInput}
          placeholder="Paste sync bearer token"
          placeholderTextColor={colors.textSubtle}
          secureTextEntry
          style={styles.tokenInput}
          value={syncTokenInput}
        />
        <View style={styles.provisioningActions}>
          <PrimaryButton
            disabled={!syncTokenInput.trim()}
            icon="shield"
            loading={isSavingSyncToken}
            onPress={saveSyncToken}
            style={styles.actionButton}
            title="Save Token"
          />
          <PrimaryButton
            disabled={!hasSyncToken}
            icon="close"
            onPress={clearSyncToken}
            style={styles.actionButton}
            title="Clear Token"
            variant="secondary"
          />
        </View>
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
  firstSection: {
    marginTop: 0,
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
  provisioningActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  section: {
    marginTop: spacing.xl,
  },
  tokenInput: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  value: {
    color: colors.text,
    flex: 0.58,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
});
