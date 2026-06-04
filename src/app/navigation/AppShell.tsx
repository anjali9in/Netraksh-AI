import React from 'react';
import {StyleSheet, View} from 'react-native';

import {AppBar} from '../../components/AppBar';
import {NavigationDrawer} from '../../components/NavigationDrawer';
import {colors} from '../../theme/colors';

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({children}: AppShellProps): React.JSX.Element {
  return (
    <View style={styles.shell}>
      <AppBar />
      <View style={styles.content}>{children}</View>
      <NavigationDrawer />
    </View>
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
