import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';

import {colors} from '../theme/colors';
import {radius, spacing} from '../theme/spacing';

type EmployeeInputProps = TextInputProps & {
  label?: string;
  helperText?: string;
  containerStyle?: ViewStyle;
  /** Fixed prefix shown before the input (e.g. +91). User cannot delete it. */
  prefix?: string;
};

export function EmployeeInput({
  label = 'Employee ID',
  helperText,
  editable = true,
  containerStyle,
  prefix,
  style,
  onChangeText,
  ...inputProps
}: EmployeeInputProps): React.JSX.Element {
  const handleChangeText = (text: string) => {
    if (!onChangeText) {
      return;
    }

    if (prefix) {
      onChangeText(text.replace(/\D/g, ''));
      return;
    }

    onChangeText(text);
  };

  return (
    <View style={[styles.field, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      {prefix ? (
        <View
          style={[
            styles.inputRow,
            !editable && styles.inputRowDisabled,
          ]}
        >
          <Text style={styles.prefix}>{prefix}</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            editable={editable}
            keyboardType="phone-pad"
            placeholder="98765 43210"
            placeholderTextColor={colors.textSubtle}
            style={[
              styles.inputPrefixed,
              !editable && styles.disabled,
              style,
            ]}
            onChangeText={handleChangeText}
            {...inputProps}
          />
        </View>
      ) : (
        <TextInput
          autoCapitalize="characters"
          editable={editable}
          placeholder="EMPLOYEE ID"
          placeholderTextColor={colors.textSubtle}
          style={[styles.input, !editable && styles.disabled, style]}
          onChangeText={onChangeText}
          {...inputProps}
        />
      )}
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  disabled: {
    backgroundColor: colors.border,
    color: colors.textSubtle,
  },
  field: {
    marginTop: spacing.md,
  },
  helper: {
    color: colors.textSubtle,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    minHeight: 50,
    paddingHorizontal: spacing.lg,
  },
  inputPrefixed: {
    backgroundColor: colors.surfaceMuted,
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    minHeight: 50,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 50,
    overflow: 'hidden',
  },
  inputRowDisabled: {
    backgroundColor: colors.border,
  },
  prefix: {
    borderRightColor: colors.border,
    borderRightWidth: 1,
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: spacing.md,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
});
