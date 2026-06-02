import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {ButtonIcon, ButtonIconName} from './icons/ButtonIcon';

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: ButtonIconName;
};

export function PrimaryButton({
  title,
  onPress,
  disabled = false,
  icon,
}: PrimaryButtonProps): React.JSX.Element {
  const iconColor = disabled ? '#64748b' : '#ffffff';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        {icon ? <ButtonIcon color={iconColor} name={icon} /> : null}
        <Text style={[styles.title, disabled && styles.disabledTitle]}>
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
    gap: 8,
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
});
