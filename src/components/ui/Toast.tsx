import { StyleSheet, Text, View } from 'react-native';

import { color, radius, space, type } from '@/theme';

type ToastVariant = 'info' | 'success' | 'warning' | 'danger';

interface ToastProps {
  message: string;
  variant?: ToastVariant;
}

const variantColor: Record<ToastVariant, string> = {
  info: color.state.info,
  success: color.state.success,
  warning: color.state.warning,
  danger: color.state.danger,
};

export function Toast({ message, variant = 'info' }: ToastProps) {
  return (
    <View accessibilityRole="alert" style={styles.container}>
      <View style={[styles.dot, { backgroundColor: variantColor[variant] }]} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: color.bg.elevated,
    borderColor: color.border.default,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  dot: {
    borderRadius: radius.pill,
    height: space.sm,
    width: space.sm,
  },
  message: {
    color: color.text.primary,
    flex: 1,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
  },
});
