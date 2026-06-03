import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';

import type {AuthLogEntry} from '../services/OfflineDatabaseService';
import type {User} from '../types/UserTypes';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.85, 360);

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type DayStatus = 'success' | 'failed' | 'mixed' | 'none';

type CalendarDay = {
  day: number;
  status: DayStatus;
  count: number;
};

type UserProfileSidebarProps = {
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

function buildCalendarDays(
  year: number,
  month: number,
  logs: AuthLogEntry[],
): CalendarDay[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayMap: Record<number, {success: number; failed: number}> = {};

  logs.forEach(log => {
    const d = new Date(log.createdAt);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!dayMap[day]) {
        dayMap[day] = {success: 0, failed: 0};
      }
      if (log.authStatus === 'SUCCESS') {
        dayMap[day].success += 1;
      } else {
        dayMap[day].failed += 1;
      }
    }
  });

  const days: CalendarDay[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const entry = dayMap[i];
    let status: DayStatus = 'none';
    let count = 0;
    if (entry) {
      count = entry.success + entry.failed;
      if (entry.success > 0 && entry.failed === 0) {
        status = 'success';
      } else if (entry.failed > 0 && entry.success === 0) {
        status = 'failed';
      } else if (entry.success > 0 && entry.failed > 0) {
        status = 'mixed';
      }
    }
    days.push({day: i, status, count});
  }

  return days;
}

function AttendanceCalendar({logs}: {logs: AuthLogEntry[]}): React.JSX.Element {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const calendarDays = buildCalendarDays(viewYear, viewMonth, logs);
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const goToPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const goToNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const cells: (CalendarDay | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...calendarDays,
  ];

  const successCount = calendarDays.filter(
    d => d.status === 'success' || d.status === 'mixed',
  ).length;
  const failedCount = calendarDays.filter(
    d => d.status === 'failed' || d.status === 'mixed',
  ).length;

  return (
    <View style={calStyles.container}>
      <View style={calStyles.header}>
        <TouchableOpacity onPress={goToPrev} style={calStyles.navBtn}>
          <Svg fill="none" height={16} viewBox="0 0 24 24" width={16}>
            <Path
              d="M15 18l-6-6 6-6"
              stroke="#0f172a"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </Svg>
        </TouchableOpacity>
        <Text style={calStyles.monthTitle}>
          {MONTHS[viewMonth]} {viewYear}
        </Text>
        <TouchableOpacity onPress={goToNext} style={calStyles.navBtn}>
          <Svg fill="none" height={16} viewBox="0 0 24 24" width={16}>
            <Path
              d="M9 18l6-6-6-6"
              stroke="#0f172a"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </Svg>
        </TouchableOpacity>
      </View>

      <View style={calStyles.dayHeaders}>
        {DAYS.map(d => (
          <Text key={d} style={calStyles.dayLabel}>
            {d}
          </Text>
        ))}
      </View>

      <View style={calStyles.grid}>
        {cells.map((cell, idx) => {
          if (!cell) {
            return <View key={`empty-${idx}`} style={calStyles.cell} />;
          }
          const isToday =
            cell.day === today.getDate() &&
            viewMonth === today.getMonth() &&
            viewYear === today.getFullYear();

          return (
            <View
              key={cell.day}
              style={[
                calStyles.cell,
                cell.status !== 'none' && calStyles[`cell_${cell.status}`],
                isToday && calStyles.cellToday,
              ]}
            >
              <Text
                style={[
                  calStyles.cellText,
                  cell.status !== 'none' && calStyles.cellTextFilled,
                  isToday && calStyles.cellTextToday,
                ]}
              >
                {cell.day}
              </Text>
              {cell.count > 0 && (
                <Text style={calStyles.cellCount}>{cell.count}</Text>
              )}
            </View>
          );
        })}
      </View>

      <View style={calStyles.legend}>
        <View style={calStyles.legendItem}>
          <View style={calStyles.legendDotSuccess} />
          <Text style={calStyles.legendText}>{successCount} days present</Text>
        </View>
        <View style={calStyles.legendItem}>
          <View style={calStyles.legendDotFailed} />
          <Text style={calStyles.legendText}>{failedCount} days failed</Text>
        </View>
      </View>
    </View>
  );
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
    <View style={infoStyles.row}>
      <Text numberOfLines={1} style={infoStyles.label}>
        {label}
      </Text>
      <Text ellipsizeMode="tail" numberOfLines={1} style={infoStyles.value}>
        {value}
      </Text>
    </View>
  );
}

export function UserProfileSidebar({
  visible,
  onClose,
  user,
  logs,
}: UserProfileSidebarProps): React.JSX.Element {
  const slideAnim = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 20,
        stiffness: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SIDEBAR_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleBackdropPress = useCallback(() => {
    onClose();
  }, [onClose]);

  const statusColor = user?.status === 'ACTIVE' ? '#16a34a' : '#dc2626';

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
            styles.sidebar,
            {transform: [{translateX: slideAnim}]},
          ]}
        >
          {/* Header */}
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>My Profile</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Svg fill="none" height={22} viewBox="0 0 24 24" width={22}>
                <Path
                  d="M18 6 6 18M6 6l12 12"
                  stroke="#475569"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </Svg>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {user ? (
              <>
                {/* Avatar & Name */}
                <View style={styles.avatarSection}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {getInitials(user.fullName)}
                    </Text>
                  </View>
                  <Text style={styles.userName}>{user.fullName}</Text>
                  <View style={[styles.statusBadge, {borderColor: statusColor}]}>
                    <View
                      style={[styles.statusDot, {backgroundColor: statusColor}]}
                    />
                    <Text style={[styles.statusText, {color: statusColor}]}>
                      {user.status}
                    </Text>
                  </View>
                </View>

                {/* Personal Info */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Personal Information</Text>
                  <View style={styles.infoCard}>
                    <InfoRow label="Employee ID" value={user.employeeId} />
                    <InfoRow label="Department" value={user.department} />
                    <InfoRow label="Designation" value={user.designation} />
                    <InfoRow label="Email" value={user.email} />
                    <InfoRow label="Phone" value={user.phone} />
                    <InfoRow label="Site" value={user.siteId} />
                  </View>
                </View>

                {/* Attendance Calendar */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Attendance</Text>
                  <AttendanceCalendar logs={logs} />
                </View>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Svg fill="none" height={56} viewBox="0 0 24 24" width={56}>
                  <Path
                    d="M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 20a8 8 0 1 1 16 0"
                    stroke="#94a3b8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                  />
                </Svg>
                <Text style={styles.emptyText}>No user profile available</Text>
                <Text style={styles.emptySubtext}>
                  Enroll a user to view their profile
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
    backgroundColor: '#1e40af',
    borderRadius: 44,
    height: 88,
    justifyContent: 'center',
    width: 88,
  },
  avatarSection: {
    alignItems: 'center',
    paddingBottom: 24,
    paddingTop: 8,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 1,
  },
  backdrop: {
    flex: 1,
  },
  closeBtn: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 48,
  },
  emptySubtext: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  overlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  sidebar: {
    backgroundColor: '#ffffff',
    flex: 1,
    maxWidth: SIDEBAR_WIDTH,
    shadowColor: '#000',
    shadowOffset: {width: -3, height: 0},
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 16,
  },
  sidebarHeader: {
    alignItems: 'center',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  sidebarTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '700',
  },
  statusBadge: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1.5,
    flexDirection: 'row',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusDot: {
    borderRadius: 4,
    height: 8,
    marginRight: 6,
    width: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  userName: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
});

const infoStyles = StyleSheet.create({
  label: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    minWidth: 85,
  },
  row: {
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  value: {
    color: '#0f172a',
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
  },
});

const calStyles = StyleSheet.create({
  cell: {
    alignItems: 'center',
    borderRadius: 6,
    height: 40,
    justifyContent: 'center',
    marginBottom: 2,
    marginRight: 1,
    width: `${100 / 7}%` as unknown as number,
  },
  cellCount: {
    color: '#ffffff',
    fontSize: 7,
    fontWeight: '700',
    lineHeight: 9,
    marginTop: 0,
  },
  cellText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '500',
  },
  cellTextFilled: {
    color: '#ffffff',
    fontWeight: '700',
  },
  cellTextToday: {
    fontWeight: '800',
  },
  cellToday: {
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  cell_failed: {
    backgroundColor: '#dc2626',
  },
  cell_mixed: {
    backgroundColor: '#f59e0b',
  },
  cell_success: {
    backgroundColor: '#16a34a',
  },
  container: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayLabel: {
    color: '#94a3b8',
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  legend: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  legendDot: {
    borderRadius: 4,
    height: 10,
    marginRight: 6,
    width: 10,
  },
  legendDotSuccess: {
    backgroundColor: '#16a34a',
    borderRadius: 4,
    height: 10,
    marginRight: 6,
    width: 10,
  },
  legendDotFailed: {
    backgroundColor: '#dc2626',
    borderRadius: 4,
    height: 10,
    marginRight: 6,
    width: 10,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
  },
  legendText: {
    color: '#64748b',
    fontSize: 11,
  },
  monthTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  navBtn: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
});
