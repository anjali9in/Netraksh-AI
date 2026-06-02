import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {ButtonIcon, ButtonIconName} from './icons/ButtonIcon';

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: ButtonIconName;
  loading?: boolean;
};

export function PrimaryButton({
  title,
  onPress,
  disabled = false,
  icon,
  loading = false,
}: PrimaryButtonProps): React.JSX.Element {
  const isDisabled = disabled || loading;
  const iconColor = isDisabled ? '#64748b' : '#ffffff';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{busy: loading, disabled: isDisabled}}
      disabled={isDisabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
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
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  disabled: {
    backgroundColor: '#cbd5e1',
  },
  disabledTitle: {
    color: '#64748b',
  },
  pressed: {
    opacity: 0.82,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  titleWithIcon: {
    marginLeft: 8,
  },
});
