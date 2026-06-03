import React from 'react';
import {ScrollView, StyleSheet, ViewStyle} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';

type ScreenContainerProps = {
  children: React.ReactNode;
  contentContainerStyle?: ViewStyle;
};

export function ScreenContainer({
  children,
  contentContainerStyle,
}: ScreenContainerProps): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.content, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.xl,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
