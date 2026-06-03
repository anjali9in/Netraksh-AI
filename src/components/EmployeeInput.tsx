import React from 'react';
import {StyleSheet, Text, TextInput, TextInputProps, View} from 'react-native';

import {colors} from '../theme/colors';
import {radius, spacing} from '../theme/spacing';

type EmployeeInputProps = TextInputProps & {
  label?: string;
  helperText?: string;
};

export function EmployeeInput({
  label = 'Employee ID',
  helperText,
  editable = true,
  style,
  ...inputProps
}: EmployeeInputProps): React.JSX.Element {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize="characters"
        editable={editable}
        placeholder="EMPLOYEE ID"
        placeholderTextColor={colors.textSubtle}
        style={[styles.input, !editable && styles.disabled, style]}
        {...inputProps}
      />
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
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
});
