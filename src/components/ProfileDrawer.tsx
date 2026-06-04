import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import type {AuthLogEntry} from '../services/OfflineDatabaseService';
import type {User} from '../types/UserTypes';
import {colors} from '../theme/colors';
import {radius, spacing} from '../theme/spacing';
import {useNetworkStatus} from '../hooks/useNetworkStatus';
import {AttendanceCalendar} from './AttendanceCalendar';
import {ButtonIcon} from './icons/ButtonIcon';
import {StatusBadge} from './StatusBadge';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.88, 380);

type ProfileDrawerProps = {
  visible: boolean;
  onClose: () => void;
  user: User | null;
  logs: AuthLogEntry[];
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}): React.JSX.Element | null {
  if (!value) {
    return null;
  }

  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text ellipsizeMode="tail" numberOfLines={1} style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

export function ProfileDrawer({
  visible,
  onClose,
  user,
  logs,
}: ProfileDrawerProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const {isOnline, isChecking: isCheckingNetwork} = useNetworkStatus();
  const pendingSyncCount = useMemo(
    () => logs.filter(log => log.syncStatus === 'PENDING').length,
    [logs],
  );
  const successCount = useMemo(
    () => logs.filter(log => log.authStatus === 'SUCCESS').length,
    [logs],
  );

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 20,
        stiffness: 200,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(slideAnim, {
      toValue: DRAWER_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [slideAnim, visible]);

  const handleBackdropPress = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleBackdropPress} />

        <Animated.View
          style={[
            styles.drawer,
            {paddingTop: insets.top + spacing.lg},
            {transform: [{translateX: slideAnim}]},
          ]}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>SECURITY PROFILE</Text>
              <Text style={styles.drawerTitle}>My Profile</Text>
            </View>
            <Pressable
              accessibilityLabel="Close profile"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeButton}
            >
              <ButtonIcon color={colors.textMuted} name="close" />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {user ? (
              <>
                <View style={styles.identityBlock}>
                  <View style={styles.avatarRing}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {getInitials(user.fullName)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.userName}>{user.fullName}</Text>
                  <Text style={styles.userMeta}>
                    {user.employeeId} | {user.siteId || 'Primary site'}
                  </Text>
                  <View style={styles.badgeRow}>
                    <StatusBadge
                      compact
                      label={user.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      status={user.status === 'ACTIVE' ? 'success' : 'error'}
                    />
                    <StatusBadge
                      compact
                      label={
                        isCheckingNetwork
                          ? 'Network...'
                          : isOnline
                          ? 'Online'
                          : 'Offline'
                      }
                      status={
                        isCheckingNetwork
                          ? 'info'
                          : isOnline
                          ? 'success'
                          : 'error'
                      }
                    />
                    {pendingSyncCount > 0 ? (
                      <StatusBadge
                        compact
                        label={`${pendingSyncCount} pending`}
                        status="warning"
                      />
                    ) : null}
                  </View>
                </View>

                <View style={styles.statRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{logs.length}</Text>
                    <Text style={styles.statLabel}>Auth logs</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{successCount}</Text>
                    <Text style={styles.statLabel}>Present</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{pendingSyncCount}</Text>
                    <Text style={styles.statLabel}>Pending</Text>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Personal Information</Text>
                  <View style={styles.infoTable}>
                    <InfoRow label="Employee ID" value={user.employeeId} />
                    <InfoRow label="Department" value={user.department} />
                    <InfoRow label="Designation" value={user.designation} />
                    <InfoRow label="Email" value={user.email} />
                    <InfoRow label="Phone" value={user.phone} />
                    <InfoRow label="Site" value={user.siteId} />
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Attendance</Text>
                  <AttendanceCalendar logs={logs} />
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Sync Status</Text>
                  <View style={styles.syncPanel}>
                    <View>
                      <Text style={styles.syncTitle}>
                        {!isOnline
                          ? 'Waiting for network restore'
                          : pendingSyncCount > 0
                          ? 'Online — sync pending'
                          : 'All local logs synced'}
                      </Text>
                      <Text style={styles.syncText}>
                        {!isOnline
                          ? 'AWS sync will resume automatically when connectivity is available.'
                          : pendingSyncCount > 0
                          ? `${pendingSyncCount} record(s) will upload on the next sync cycle.`
                          : 'Device is connected and local data matches the cloud queue.'}
                      </Text>
                    </View>
                    <StatusBadge
                      compact
                      label={user.syncStatus}
                      status={
                        user.syncStatus === 'SYNCED'
                          ? 'success'
                          : user.syncStatus === 'PENDING'
                          ? 'warning'
                          : 'error'
                      }
                    />
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.avatar}>
                  <ButtonIcon color={colors.surface} name="user" size={34} />
                </View>
                <Text style={styles.emptyTitle}>No profile available</Text>
                <Text style={styles.emptyText}>
                  Enroll a user to populate secure profile details.
                </Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.round,
    height: 82,
    justifyContent: 'center',
    width: 82,
  },
  avatarRing: {
    borderColor: colors.primaryLight,
    borderRadius: radius.round,
    borderWidth: 8,
  },
  avatarText: {
    color: colors.surface,
    fontSize: 28,
    fontWeight: '800',
  },
  backdrop: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  closeButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.round,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  drawer: {
    backgroundColor: colors.surface,
    flex: 1,
    maxWidth: DRAWER_WIDTH,
    shadowColor: colors.shadow,
    shadowOffset: {width: -6, height: 0},
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 16,
  },
  drawerTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
  },
  emptyText: {
    color: colors.textSubtle,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: spacing.lg,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  identityBlock: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  infoLabel: {
    color: colors.textSubtle,
    flex: 0.42,
    fontSize: 12,
    fontWeight: '800',
  },
  infoRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  infoTable: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  infoValue: {
    color: colors.text,
    flex: 0.58,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  overlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.46)',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    paddingVertical: spacing.md,
  },
  statLabel: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  statRow: {
    flexDirection: 'row',
  },
  statValue: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  syncPanel: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  syncText: {
    color: colors.textSubtle,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  syncTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  userMeta: {
    color: colors.textSubtle,
    fontSize: 13,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  userName: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '800',
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
