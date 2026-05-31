import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/lib/useReducedMotion';
import { color, motion, planetGradient, radius, space, type PlanetId } from '@/theme';

interface ScreenBackdropProps extends ViewProps {
  planet?: PlanetId;
}

export function ScreenBackdrop({ children, planet, style, ...viewProps }: ScreenBackdropProps) {
  const gradient = planet ? planetGradient(planet) : null;
  const colors = gradient?.colors ?? screenColors;
  const locations = gradient?.locations ?? screenLocations;
  const reduceMotion = useReducedMotion();
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      drift.value = withTiming(0, { duration: motion.duration.fast });
      return;
    }

    drift.value = withRepeat(
      withTiming(1, {
        duration: motion.duration.ambient,
        easing: motion.easing.standard,
      }),
      -1,
      true
    );
  }, [drift, reduceMotion]);

  const motionGlowStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 0.08 : 0.08 + drift.value * 0.08,
    transform: [
      { translateX: -space['6xl'] + drift.value * space['6xl'] * 2 },
      { translateY: space['6xl'] - drift.value * space['6xl'] },
    ],
  }));

  return (
    <LinearGradient
      {...viewProps}
      colors={colors}
      locations={locations}
      style={[styles.container, style]}
    >
      {/* TODO FE-XX: add a subtle grain texture asset over this static gradient. */}
      <Animated.View pointerEvents="none" style={[styles.motionGlow, motionGlowStyle]} />
      <View pointerEvents="none" style={styles.veil} />
      {children}
    </LinearGradient>
  );
}

const screenColors = [color.bg.base, color.bg.surface, color.bg.base] as const;
const screenLocations = [0, 0.48, 1] as const;
const glowSize = space['6xl'] * 4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  motionGlow: {
    backgroundColor: color.brand.accent,
    borderRadius: radius.pill,
    height: glowSize,
    position: 'absolute',
    right: -space['6xl'],
    top: -space['6xl'],
    width: glowSize,
  },
  veil: {
    backgroundColor: color.bg.overlay,
    bottom: 0,
    left: 0,
    opacity: 0.18,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
