import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';

import {colors} from '../theme/colors';
import {radius, spacing} from '../theme/spacing';
import {ButtonIcon, ButtonIconName} from './icons/ButtonIcon';

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: ButtonIconName;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  title,
  onPress,
  disabled = false,
  icon,
  loading = false,
  variant = 'primary',
  style,
}: PrimaryButtonProps): React.JSX.Element {
  const isDisabled = disabled || loading;
  const iconColor =
    isDisabled || variant === 'secondary' || variant === 'ghost'
      ? colors.textSubtle
      : colors.surface;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{busy: loading, disabled: isDisabled}}
      disabled={isDisabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        styles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={iconColor} size="small" />
        ) : icon ? (
          <ButtonIcon color={iconColor} name={icon} />
        ) : null}
        <Text
          style={[
            styles.title,
            (icon || loading) && styles.titleWithIcon,
            (variant === 'secondary' || variant === 'ghost') &&
              styles.secondaryTitle,
            isDisabled && styles.disabledTitle,
          ]}
        >
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  danger: {
    backgroundColor: colors.error,
  },
  disabled: {
    backgroundColor: colors.border,
    borderColor: colors.border,
  },
  disabledTitle: {
    color: colors.textSubtle,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  primary: {
    backgroundColor: colors.primary,
    shadowColor: colors.primaryDark,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 3,
  },
  pressed: {
    opacity: 0.82,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  secondaryTitle: {
    color: colors.text,
  },
  title: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  titleWithIcon: {
    marginLeft: spacing.sm,
  },
});
