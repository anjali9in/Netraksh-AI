import React, {useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Svg, {Path} from 'react-native-svg';

import type {AuthLogEntry} from '../services/OfflineDatabaseService';
import {colors} from '../theme/colors';
import {radius, spacing} from '../theme/spacing';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

type DayStatus = 'success' | 'failed' | 'mixed' | 'none';

type CalendarDay = {
  day: number;
  status: DayStatus;
  count: number;
};

type AttendanceCalendarProps = {
  logs: AuthLogEntry[];
};

function buildCalendarDays(
  year: number,
  month: number,
  logs: AuthLogEntry[],
): CalendarDay[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayMap: Record<number, {success: number; failed: number}> = {};

  logs.forEach(log => {
    const date = new Date(log.createdAt);
    if (date.getFullYear() !== year || date.getMonth() !== month) {
      return;
    }

    const day = date.getDate();
    if (!dayMap[day]) {
      dayMap[day] = {success: 0, failed: 0};
    }

    if (log.authStatus === 'SUCCESS') {
      dayMap[day].success += 1;
    } else {
      dayMap[day].failed += 1;
    }
  });

  return Array.from({length: daysInMonth}, (_, index) => {
    const day = index + 1;
    const entry = dayMap[day];

    if (!entry) {
      return {day, status: 'none', count: 0};
    }

    const count = entry.success + entry.failed;
    if (entry.success > 0 && entry.failed > 0) {
      return {day, status: 'mixed', count};
    }

    return {
      day,
      count,
      status: entry.success > 0 ? 'success' : 'failed',
    };
  });
}

export function AttendanceCalendar({
  logs,
}: AttendanceCalendarProps): React.JSX.Element {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const calendarDays = useMemo(
    () => buildCalendarDays(viewYear, viewMonth, logs),
    [logs, viewMonth, viewYear],
  );
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const cells: (CalendarDay | null)[] = [
    ...Array.from({length: firstDayOfWeek}, () => null),
    ...calendarDays,
  ];
  const presentDays = calendarDays.filter(
    day => day.status === 'success' || day.status === 'mixed',
  ).length;
  const failedDays = calendarDays.filter(
    day => day.status === 'failed' || day.status === 'mixed',
  ).length;

  const goToPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(year => year - 1);
      return;
    }
    setViewMonth(month => month - 1);
  };

  const goToNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(year => year + 1);
      return;
    }
    setViewMonth(month => month + 1);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Previous month"
          accessibilityRole="button"
          onPress={goToPrev}
          style={styles.navButton}
        >
          <Svg fill="none" height={17} viewBox="0 0 24 24" width={17}>
            <Path
              d="M15 18l-6-6 6-6"
              stroke={colors.text}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </Svg>
        </Pressable>
        <Text style={styles.monthTitle}>
          {MONTHS[viewMonth]} {viewYear}
        </Text>
        <Pressable
          accessibilityLabel="Next month"
          accessibilityRole="button"
          onPress={goToNext}
          style={styles.navButton}
        >
          <Svg fill="none" height={17} viewBox="0 0 24 24" width={17}>
            <Path
              d="M9 18l6-6-6-6"
              stroke={colors.text}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </Svg>
        </Pressable>
      </View>

      <View style={styles.dayHeaders}>
        {DAYS.map(day => (
          <Text key={day} style={styles.dayLabel}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, index) => {
          if (!cell) {
            return <View key={`empty-${index}`} style={styles.cell} />;
          }

          const isToday =
            cell.day === today.getDate() &&
            viewMonth === today.getMonth() &&
            viewYear === today.getFullYear();

          return (
            <View
              key={`${viewMonth}-${cell.day}`}
              style={[
                styles.cell,
                cell.status !== 'none' && styles[`cell_${cell.status}`],
                isToday && styles.today,
              ]}
            >
              <Text
                style={[
                  styles.cellText,
                  cell.status !== 'none' && styles.cellTextActive,
                  isToday && styles.todayText,
                ]}
              >
                {cell.day}
              </Text>
              {cell.count > 0 ? (
                <Text style={styles.cellCount}>{cell.count}</Text>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.presentDot]} />
          <Text style={styles.legendText}>{presentDays} present days</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.failedDot]} />
          <Text style={styles.legendText}>{failedDays} failed days</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    alignItems: 'center',
    borderRadius: radius.sm,
    height: 38,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: '14.2857%',
  },
  cell_failed: {
    backgroundColor: colors.error,
  },
  cell_mixed: {
    backgroundColor: colors.warning,
  },
  cell_success: {
    backgroundColor: colors.success,
  },
  cellCount: {
    color: colors.surface,
    fontSize: 8,
    fontWeight: '800',
    lineHeight: 10,
  },
  cellText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  cellTextActive: {
    color: colors.surface,
  },
  container: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  dayLabel: {
    color: colors.textSubtle,
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  failedDot: {
    backgroundColor: colors.error,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  legend: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  legendDot: {
    borderRadius: 4,
    height: 9,
    marginRight: spacing.sm,
    width: 9,
  },
  legendItem: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  legendText: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '600',
  },
  monthTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  navButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.round,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  presentDot: {
    backgroundColor: colors.success,
  },
  today: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  todayText: {
    fontWeight: '800',
  },
});
