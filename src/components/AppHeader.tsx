import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {colors} from '../theme/colors';
import {radius, spacing} from '../theme/spacing';
import {ButtonIcon} from './icons/ButtonIcon';
import {StatusBadge} from './StatusBadge';

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  statusLabel?: string;
  status?: 'success' | 'warning' | 'error' | 'info';
  onProfilePress?: () => void;
};

export function AppHeader({
  title,
  subtitle,
  statusLabel,
  status = 'info',
  onProfilePress,
}: AppHeaderProps): React.JSX.Element {
  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>NETRAKSH AI</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {statusLabel ? (
          <View style={styles.status}>
            <StatusBadge compact label={statusLabel} status={status} />
          </View>
        ) : null}
      </View>
      {onProfilePress ? (
        <Pressable
          accessibilityLabel="Open profile"
          accessibilityRole="button"
          onPress={onProfilePress}
          style={({pressed}) => [
            styles.profileButton,
            pressed && styles.profileButtonPressed,
          ]}
        >
          <ButtonIcon color={colors.surface} name="user" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    paddingRight: spacing.md,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  profileButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.round,
    height: 48,
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.18,
    shadowRadius: 14,
    width: 48,
    elevation: 4,
  },
  profileButtonPressed: {
    opacity: 0.82,
  },
  status: {
    marginTop: spacing.md,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    marginTop: spacing.xs,
  },
});
