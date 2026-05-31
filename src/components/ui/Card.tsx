import { Pressable, StyleSheet, View, type PressableProps, type ViewProps } from 'react-native';

import { color, elevation, radius, space, type PlanetId, PLANET_COLORS } from '@/theme';

interface CardProps extends ViewProps {
  level?: 1 | 2 | 3;
  padding?: keyof typeof space;
  cardRadius?: keyof typeof radius;
  planetTint?: PlanetId;
  onPress?: PressableProps['onPress'];
  variant?: 'default' | 'glass' | 'hero' | 'compact';
}

export function Card({
  children,
  level = 1,
  padding,
  cardRadius,
  planetTint,
  onPress,
  variant = 'default',
  style,
  ...viewProps
}: CardProps) {
  const resolvedRadius = cardRadius ?? (variant === 'hero' ? '2xl' : 'lg');
  const resolvedPadding = padding ?? (variant === 'compact' ? 'md' : 'lg');
  const content = (
    <View
      {...viewProps}
      style={[
        styles.card,
        elevation[level],
        variantStyles[variant],
        {
          borderRadius: radius[resolvedRadius],
          padding: space[resolvedPadding],
        },
        style,
      ]}
    >
      {planetTint ? (
        <View
          style={[styles.tint, { backgroundColor: PLANET_COLORS[planetTint].secondary }]}
        />
      ) : null}
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.85,
  },
  tint: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 4,
  },
});

const variantStyles = StyleSheet.create({
  compact: {
    backgroundColor: color.bg.surface,
    borderColor: color.border.subtle,
  },
  default: {},
  glass: {
    backgroundColor: color.bg.glass,
    borderColor: color.border.default,
  },
  hero: {
    backgroundColor: color.bg.hero,
    borderColor: color.border.strong,
  },
});
