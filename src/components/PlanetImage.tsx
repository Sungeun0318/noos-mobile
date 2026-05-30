import { Image, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

import { PLANET_IMAGES } from '@/theme/planetImages';
import { type PlanetId, radius } from '@/theme';

interface PlanetImageProps {
  planet: PlanetId;
  size: number;
  round?: boolean;
  style?: StyleProp<ImageStyle>;
}

export function PlanetImage({ planet, size, round = false, style }: PlanetImageProps) {
  return (
    <Image
      accessibilityIgnoresInvertColors
      resizeMode="cover"
      source={PLANET_IMAGES[planet]}
      style={[
        styles.image,
        {
          borderRadius: round ? size / 2 : radius.sm,
          height: size,
          width: size,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    overflow: 'hidden',
  },
});
