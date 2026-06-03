import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useNavigationState,
} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import type {ButtonIconName} from './icons/ButtonIcon';
import {
  MAIN_NAV_ITEMS,
  PROFILE_NAV_ITEM,
} from '../app/navigation/navigationConfig';
import {ROUTES, type RouteName} from '../app/navigation/routes';
import {colors} from '../theme/colors';
import {radius, spacing} from '../theme/spacing';
import {ButtonIcon} from './icons/ButtonIcon';

export const SIDEBAR_WIDTH = 84;

type LeftNavigationBarProps = {
  navigation?: NavigationProp<ParamListBase>;
  /** Called after a route is selected (e.g. to close the drawer). */
  onNavigate?: () => void;
};

export function LeftNavigationBar({
  navigation: navigationProp,
  onNavigate,
}: LeftNavigationBarProps): React.JSX.Element {
  const defaultNavigation = useNavigation<NavigationProp<ParamListBase>>();
  const navigation = navigationProp ?? defaultNavigation;
  const insets = useSafeAreaInsets();

  const activeRoute = useNavigationState(state => {
    if (!state) {
      return ROUTES.HOME;
    }

    const route = state.routes[state.index];
    return route.name as RouteName;
  });

  const navigateTo = (route: RouteName) => {
    if (activeRoute !== route) {
      navigation.navigate(route);
    }

    onNavigate?.();
  };

  return (
    <View
      style={[
        styles.sidebar,
        {
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.md,
        },
      ]}
    >
      <View style={styles.brandBlock}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>NA</Text>
        </View>
        <Text style={styles.brandLabel}>Netraksh</Text>
      </View>

      <View style={styles.navItems}>
        {MAIN_NAV_ITEMS.map(item => (
          <NavButton
            key={item.route}
            active={activeRoute === item.route}
            icon={item.icon}
            label={item.label}
            onPress={() => navigateTo(item.route)}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <NavButton
          active={activeRoute === PROFILE_NAV_ITEM.route}
          icon={PROFILE_NAV_ITEM.icon}
          label={PROFILE_NAV_ITEM.label}
          onPress={() => navigateTo(PROFILE_NAV_ITEM.route)}
        />
      </View>
    </View>
  );
}

type NavButtonProps = {
  label: string;
  icon: ButtonIconName;
  active: boolean;
  onPress: () => void;
};

function NavButton({
  label,
  icon,
  active,
  onPress,
}: NavButtonProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{selected: active}}
      onPress={onPress}
      style={({pressed}) => [
        styles.navButton,
        active && styles.navButtonActive,
        pressed && styles.navButtonPressed,
      ]}
    >
      <ButtonIcon
        color={active ? colors.surface : colors.primaryLight}
        name={icon}
        size={22}
      />
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  brandBlock: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  brandLabel: {
    color: colors.primaryLight,
    fontSize: 9,
    fontWeight: '800',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  brandMarkText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  footer: {
    marginTop: 'auto',
  },
  navButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    width: '100%',
  },
  navButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderColor: colors.surface,
    borderLeftWidth: 3,
    borderRadius: radius.md,
  },
  navButtonPressed: {
    opacity: 0.86,
  },
  navItems: {
    flex: 1,
    width: '100%',
  },
  navLabel: {
    color: colors.primaryLight,
    fontSize: 10,
    fontWeight: '700',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  navLabelActive: {
    color: colors.surface,
    fontWeight: '800',
  },
  sidebar: {
    backgroundColor: colors.primaryDark,
    borderRightColor: 'rgba(255, 255, 255, 0.08)',
    borderRightWidth: 1,
    flex: 1,
    width: SIDEBAR_WIDTH,
  },
});
