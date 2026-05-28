import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { color, radius, space, type } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

const heights: Record<ButtonSize, number> = {
  sm: 36,
  md: 48,
  lg: 56,
};

const horizontalPadding: Record<ButtonSize, number> = {
  sm: space.md,
  md: space.lg,
  lg: space.xl,
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  ...pressableProps
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      {...pressableProps}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        {
          height: heights[size],
          paddingHorizontal: horizontalPadding[size],
          width: fullWidth ? '100%' : undefined,
        },
        (disabled || loading) && styles.disabled,
        pressed && !(disabled || loading) && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? color.text.inverse : color.text.primary} />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  destructive: {
    backgroundColor: 'transparent',
    borderColor: color.border.subtle,
    borderWidth: StyleSheet.hairlineWidth,
  },
  destructiveLabel: {
    color: color.state.danger,
  },
  disabled: {
    opacity: 0.4,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostLabel: {
    color: color.text.primary,
  },
  label: {
    fontFamily: type.bodyMd.family,
    fontSize: type.bodyMd.size,
    fontWeight: type.bodyMd.weight,
    lineHeight: type.bodyMd.lineHeight,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  primary: {
    backgroundColor: color.brand.accent,
  },
  primaryLabel: {
    color: color.text.inverse,
  },
  secondary: {
    backgroundColor: color.bg.surfaceAlt,
    borderColor: color.border.default,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryLabel: {
    color: color.text.primary,
  },
});
