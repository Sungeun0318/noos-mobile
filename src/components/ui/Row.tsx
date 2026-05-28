import { Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';

import { Card } from './Card';
import { color, space, type } from '@/theme';

interface RowProps {
  label: string;
  value?: string;
  hint?: string;
  disabled?: boolean;
  right?: React.ReactNode;
  onPress?: PressableProps['onPress'];
}

export function Row({ label, value, hint, disabled = false, right, onPress }: RowProps) {
  const content = (
    <Card level={1} padding="lg" style={disabled && styles.disabled}>
      <View style={styles.content}>
        <View style={styles.textBlock}>
          <Text style={[styles.label, disabled && styles.disabledText]}>{label}</Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
        <View style={styles.right}>
          {value ? <Text numberOfLines={1} style={styles.value}>{value}</Text> : null}
          {right}
          {onPress && !disabled ? <Text style={styles.chevron}>›</Text> : null}
        </View>
      </View>
    </Card>
  );

  if (!onPress || disabled) {
    return content;
  }

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chevron: {
    color: color.text.tertiary,
    fontFamily: type.h2.family,
    fontSize: type.h2.size,
    fontWeight: type.h2.weight,
    lineHeight: type.h2.lineHeight,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  disabled: {
    opacity: 0.45,
  },
  disabledText: {
    color: color.text.disabled,
  },
  hint: {
    color: color.text.tertiary,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
  },
  label: {
    color: color.text.primary,
    fontFamily: type.bodyMd.family,
    fontSize: type.bodyMd.size,
    fontWeight: type.bodyMd.weight,
    lineHeight: type.bodyMd.lineHeight,
  },
  pressed: {
    opacity: 0.85,
  },
  right: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'flex-end',
  },
  textBlock: {
    flex: 1,
    gap: space.xs,
  },
  value: {
    color: color.text.tertiary,
    flexShrink: 1,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
  },
});
