import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { color } from '@/theme';

interface NoosLogoProps {
  size: number;
  tint?: string;
  style?: StyleProp<ViewStyle>;
}

export function NoosLogo({ size, tint = color.brand.noos, style }: NoosLogoProps) {
  return (
    <View
      accessibilityLabel="NOOS logo"
      accessibilityRole="image"
      style={[
        styles.mark,
        {
          backgroundColor: tint,
          borderRadius: size / 2,
          height: size,
          width: size,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  mark: {
    opacity: 0.92,
  },
});
