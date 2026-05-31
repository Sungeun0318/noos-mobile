import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { color, radius, space } from '@/theme';

type BrandBackdropProps = ViewProps;

export function BrandBackdrop({ children, style, ...viewProps }: BrandBackdropProps) {
  return (
    <LinearGradient
      {...viewProps}
      colors={brandColors}
      locations={brandLocations}
      style={[styles.container, style]}
    >
      <View pointerEvents="none" style={styles.glowTop} />
      <View pointerEvents="none" style={styles.glowBottom} />
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
