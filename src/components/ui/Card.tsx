import { BlurView } from 'expo-blur';
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
  const isGlass = variant === 'glass';
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
      {isGlass ? (
        <>
          <BlurView intensity={34} pointerEvents="none" style={styles.glassBlur} tint="dark" />
          <View pointerEvents="none" style={styles.glassOverlay} />
        </>
      ) : null}
      {planetTint ? (
        <View
          style={[styles.tint, { backgroundColor: PLANET_COLORS[planetTint].secondary }]}
        />
      ) : null}
      {isGlass ? <View style={styles.glassContent}>{children}</View> : children}
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
  glassBlur: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 0,
  },
  glassContent: {
    zIndex: 2,
  },
  glassOverlay: {
    backgroundColor: color.bg.glass,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1,
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
    zIndex: 2,
  },
});

const variantStyles = StyleSheet.create({
  compact: {
    backgroundColor: color.bg.surface,
    borderColor: color.border.subtle,
  },
  default: {},
  glass: {
    backgroundColor: 'transparent',
    borderColor: color.border.default,
  },
  hero: {
    backgroundColor: color.bg.hero,
    borderColor: color.border.strong,
  },
});
