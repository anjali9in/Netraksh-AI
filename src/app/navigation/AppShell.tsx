import React from 'react';
import {StyleSheet, View} from 'react-native';

import {NavigationDrawer} from '../../components/NavigationDrawer';
import {colors} from '../../theme/colors';
import {NavigationMenuProvider} from './NavigationMenuContext';

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({children}: AppShellProps): React.JSX.Element {
  return (
    <NavigationMenuProvider>
      <View style={styles.shell}>
        <View style={styles.content}>{children}</View>
        <NavigationDrawer />
      </View>
    </NavigationMenuProvider>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: colors.background,
    flex: 1,
  },
  shell: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
