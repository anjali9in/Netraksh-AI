import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useNavigationState} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {ROUTE_TITLES} from '../app/navigation/navigationConfig';
import {useNavigationMenu} from '../app/navigation/NavigationMenuContext';
import {ROUTES, type RouteName} from '../app/navigation/routes';
import {APP_NAME} from '../config/appConfig';
import {colors} from '../theme/colors';
import {radius, spacing} from '../theme/spacing';
import {ButtonIcon} from './icons/ButtonIcon';

export function AppBar(): React.JSX.Element {
  const {openMenu} = useNavigationMenu();

  const activeRoute = useNavigationState(state => {
    if (!state) {
      return ROUTES.HOME;
    }

    const route = state.routes[state.index];
    return route.name as RouteName;
  });

  const screenTitle = ROUTE_TITLES[activeRoute] ?? APP_NAME;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.bar}>
        <Pressable
          accessibilityLabel="Open navigation menu"
          accessibilityRole="button"
          hitSlop={8}
          onPress={openMenu}
          style={({pressed}) => [
            styles.menuButton,
            pressed && styles.menuButtonPressed,
          ]}
        >
          <ButtonIcon color={colors.primary} name="menu" size={22} />
        </Pressable>

        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>{APP_NAME}</Text>
          <Text ellipsizeMode="tail" numberOfLines={1} style={styles.title}>
            {screenTitle}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowColor: colors.shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  menuButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 44,
  },
  menuButtonPressed: {
    opacity: 0.82,
  },
  safeArea: {
    backgroundColor: colors.surface,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  titleBlock: {
    flex: 1,
    paddingRight: spacing.sm,
  },
});
