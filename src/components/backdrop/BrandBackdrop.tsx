import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, type ViewProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/lib/useReducedMotion';
import { color, motion, radius, space } from '@/theme';

type BrandBackdropProps = ViewProps;

export function BrandBackdrop({ children, style, ...viewProps }: BrandBackdropProps) {
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

  const topGlowStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 0.05 : 0.05 + drift.value * 0.04,
    transform: [
      { translateX: drift.value * space['5xl'] },
      { translateY: drift.value * space['3xl'] },
    ],
  }));

  const bottomGlowStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 0.1 : 0.1 + (1 - drift.value) * 0.06,
    transform: [
      { translateX: -drift.value * space['5xl'] },
      { translateY: -drift.value * space['3xl'] },
    ],
  }));

  return (
    <LinearGradient
      {...viewProps}
      colors={brandColors}
      locations={brandLocations}
      style={[styles.container, style]}
    >
      <Animated.View pointerEvents="none" style={[styles.glowTop, topGlowStyle]} />
      <Animated.View pointerEvents="none" style={[styles.glowBottom, bottomGlowStyle]} />
      {children}
    </LinearGradient>
  );
}

const brandColors = [color.bg.base, color.bg.surfaceAlt, color.bg.base] as const;
const brandLocations = [0, 0.52, 1] as const;
const glowSize = space['6xl'] * 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  glowBottom: {
    backgroundColor: color.brand.accent,
    borderRadius: radius.pill,
    bottom: -space['6xl'],
    height: glowSize,
    opacity: 0.1,
    position: 'absolute',
    right: -space['6xl'],
    width: glowSize,
  },
  glowTop: {
    backgroundColor: color.brand.noos,
    borderRadius: radius.pill,
    height: glowSize,
    left: -space['6xl'],
    opacity: 0.05,
    position: 'absolute',
    top: -space['6xl'],
    width: glowSize,
  },
});
