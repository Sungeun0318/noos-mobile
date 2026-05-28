import {
  StyleSheet,
  Text,
  TextInput as NativeTextInput,
  View,
  type TextInputProps as NativeTextInputProps,
} from 'react-native';

import { color, radius, space, type } from '@/theme';

interface TextInputProps extends NativeTextInputProps {
  label: string;
  error?: string | null;
}

export function TextInput({ label, error, style, ...inputProps }: TextInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <NativeTextInput
        {...inputProps}
        placeholderTextColor={color.text.tertiary}
        style={[styles.input, error && styles.inputError, style]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: space.sm,
  },
  error: {
    color: color.state.danger,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
  },
  input: {
    backgroundColor: color.bg.surface,
    borderColor: color.border.default,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    color: color.text.primary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    minHeight: 48,
    paddingHorizontal: space.lg,
  },
  inputError: {
    borderColor: color.state.danger,
  },
  label: {
    color: color.text.secondary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    letterSpacing: 0.4,
    lineHeight: type.caption.lineHeight,
  },
});
