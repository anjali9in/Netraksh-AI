import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {useNavigationMenuOptional} from '../app/navigation/NavigationMenuContext';
import {colors} from '../theme/colors';
import {radius, spacing} from '../theme/spacing';
import {ButtonIcon} from './icons/ButtonIcon';
import {StatusBadge} from './StatusBadge';

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  statusLabel?: string;
  status?: 'success' | 'warning' | 'error' | 'info';
  onBackPress?: () => void;
  /** Opens the side navigation drawer. Defaults to the app menu when inside AppShell. */
  onMenuPress?: () => void;
  showMenuButton?: boolean;
};

export function AppHeader({
  title,
  subtitle,
  statusLabel,
  status = 'info',
  onBackPress,
  onMenuPress,
  showMenuButton = true,
}: AppHeaderProps): React.JSX.Element {
  const navigationMenu = useNavigationMenuOptional();
  const handleMenuPress = onMenuPress ?? navigationMenu?.openMenu;
  const shouldShowMenu = showMenuButton && Boolean(handleMenuPress);

  const menuButton = shouldShowMenu ? (
    <Pressable
      accessibilityLabel="Open navigation menu"
      accessibilityRole="button"
      hitSlop={8}
      onPress={handleMenuPress}
      style={({pressed}) => [
        styles.menuButton,
        pressed && styles.headerButtonPressed,
      ]}
    >
      <ButtonIcon color={colors.surface} name="user" />
    </Pressable>
  ) : null;

  if (onBackPress) {
    return (
      <View style={styles.headerWithBack}>
        {menuButton}
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBackPress}
          style={({pressed}) => [
            styles.backButton,
            menuButton ? styles.backButtonAfterMenu : styles.backButtonOffset,
            pressed && styles.headerButtonPressed,
          ]}
        >
          <ButtonIcon color={colors.primary} name="arrowLeft" />
        </Pressable>

        <View style={styles.backCopy}>
          <HeaderCopy
            status={status}
            statusLabel={statusLabel}
            subtitle={subtitle}
            title={title}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.header}>
      {menuButton}
      <View style={[styles.copy, shouldShowMenu && styles.copyWithMenu]}>
        <HeaderCopy
          status={status}
          statusLabel={statusLabel}
          subtitle={subtitle}
          title={title}
        />
      </View>
    </View>
  );
}

function HeaderCopy({
  title,
  subtitle,
  statusLabel,
  status,
}: {
  title: string;
  subtitle?: string;
  statusLabel?: string;
  status: 'success' | 'warning' | 'error' | 'info';
}): React.JSX.Element {
  return (
    <>
      <Text style={styles.eyebrow}>NETRAKSH AI</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {statusLabel ? (
        <View style={styles.status}>
          <StatusBadge compact label={statusLabel} status={status} />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.round,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  backButtonAfterMenu: {
    marginRight: spacing.md,
    marginTop: -2,
  },
  backButtonOffset: {
    marginLeft: -4,
    marginRight: spacing.xl,
    marginTop: -2,
  },
  backCopy: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  copy: {
    flex: 1,
    paddingRight: spacing.md,
  },
  copyWithMenu: {
    paddingLeft: spacing.md,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  headerWithBack: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  menuButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.round,
    height: 48,
    justifyContent: 'center',
    marginRight: spacing.md,
    marginTop: -2,
    shadowColor: colors.primaryDark,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.18,
    shadowRadius: 14,
    width: 48,
    elevation: 4,
  },
  headerButtonPressed: {
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
