import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { PlanetImage } from '@/components/PlanetImage';
import { color, planetGradient, radius, space, type PlanetId } from '@/theme';

interface PlanetHeroProps {
  planet: PlanetId;
  children: ReactNode;
  imageSize?: number;
}

export function PlanetHero({ planet, children, imageSize = space['6xl'] }: PlanetHeroProps) {
  const gradient = planetGradient(planet);

  return (
    <LinearGradient colors={gradient.colors} locations={gradient.locations} style={styles.container}>
      <View pointerEvents="none" style={styles.orbitGlow} />
      <View style={styles.copy}>{children}</View>
      <PlanetImage planet={planet} round size={imageSize} style={styles.planet} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderColor: color.border.default,
    borderRadius: radius['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: space.lg,
    minHeight: space['6xl'] * 2 + space.xl,
    overflow: 'hidden',
    padding: space.xl,
  },
  copy: {
    flex: 1,
    gap: space.sm,
    justifyContent: 'center',
  },
  orbitGlow: {
    backgroundColor: color.bg.overlay,
    borderRadius: radius.pill,
    bottom: -space['5xl'],
    height: space['6xl'] * 2,
    opacity: 0.32,
    position: 'absolute',
    right: -space['5xl'],
    width: space['6xl'] * 2,
  },
  planet: {
    alignSelf: 'center',
    borderColor: color.border.strong,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
