import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { color, planetGradient, type PlanetId } from '@/theme';

interface ScreenBackdropProps extends ViewProps {
  planet?: PlanetId;
}

export function ScreenBackdrop({ children, planet, style, ...viewProps }: ScreenBackdropProps) {
  const gradient = planet ? planetGradient(planet) : null;
  const colors = gradient?.colors ?? screenColors;
  const locations = gradient?.locations ?? screenLocations;

  return (
    <LinearGradient
      {...viewProps}
      colors={colors}
      locations={locations}
      style={[styles.container, style]}
    >
      {/* TODO FE-XX: add a subtle grain texture asset over this static gradient. */}
      <View pointerEvents="none" style={styles.veil} />
      {children}
    </LinearGradient>
  );
}

const screenColors = [color.bg.base, color.bg.surface, color.bg.base] as const;
const screenLocations = [0, 0.48, 1] as const;

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
