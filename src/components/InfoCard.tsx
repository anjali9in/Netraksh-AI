import React from 'react';
import {StyleSheet, Text, View, ViewStyle} from 'react-native';

import {colors} from '../theme/colors';
import {radius, spacing} from '../theme/spacing';

type InfoCardProps = {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  style?: ViewStyle;
};

export function InfoCard({
  title,
  subtitle,
  children,
  footer,
  style,
}: InfoCardProps): React.JSX.Element {
  return (
    <View style={[styles.card, style]}>
      {title || subtitle ? (
        <View style={styles.header}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
      {children}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  footer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  header: {
    marginBottom: spacing.md,
  },
  subtitle: {
    color: colors.textSubtle,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
});
