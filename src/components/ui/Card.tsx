import { Pressable, StyleSheet, View, type PressableProps, type ViewProps } from 'react-native';

import { elevation, radius, space, type PlanetId, PLANET_COLORS } from '@/theme';

interface CardProps extends ViewProps {
  level?: 1 | 2 | 3;
  padding?: keyof typeof space;
  cardRadius?: keyof typeof radius;
  planetTint?: PlanetId;
  onPress?: PressableProps['onPress'];
}

export function Card({
  children,
  level = 1,
  padding = 'lg',
  cardRadius = 'lg',
  planetTint,
  onPress,
  style,
  ...viewProps
}: CardProps) {
  const content = (
    <View
      {...viewProps}
      style={[
        styles.card,
        elevation[level],
        {
          borderRadius: radius[cardRadius],
          padding: space[padding],
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
