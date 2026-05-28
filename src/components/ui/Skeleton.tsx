import { StyleSheet, View } from 'react-native';

import { color, radius as radiusTokens } from '@/theme';

interface SkeletonProps {
  width: number | `${number}%`;
  height: number;
  radius?: keyof typeof radiusTokens;
}

export function Skeleton({ width, height, radius = 'sm' }: SkeletonProps) {
  return (
    <View
      accessibilityLabel="loading"
      style={[
        styles.base,
        {
          borderRadius: radiusTokens[radius],
          height,
          width,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: color.bg.surfaceAlt,
    opacity: 0.6,
  },
});
