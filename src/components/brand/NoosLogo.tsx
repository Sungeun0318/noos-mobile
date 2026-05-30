import { type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { color } from '@/theme';

interface NoosLogoProps {
  size: number;
  tint?: string;
  style?: StyleProp<ViewStyle>;
}

export function NoosLogo({ size, tint = color.brand.noos, style }: NoosLogoProps) {
  return (
    <Svg
      accessibilityLabel="NOOS logo"
      accessibilityRole="image"
      height={size}
      style={style}
      viewBox="0 0 64 64"
      width={size}
    >
      {/* eslint-disable-next-line no-restricted-syntax -- Brand asset source color from noos-mark.svg. */}
      <Rect width="64" height="64" rx="16" fill="#050505" />
      <Ellipse cx="32" cy="32" rx="23" ry="13" stroke={tint} strokeWidth="4" />
      <Path
        d="M17 34C25 26.8 35.5 24.4 47 29.2"
        stroke={tint}
        strokeLinecap="round"
        strokeWidth="4"
      />
      <Circle cx="22" cy="38.5" r="1.6" fill={tint} />
      <Circle cx="27" cy="40" r="1.6" fill={tint} />
      <Circle cx="32" cy="40.6" r="1.6" fill={tint} />
      <Circle cx="37" cy="40" r="1.6" fill={tint} />
      <Circle cx="42" cy="38.5" r="1.6" fill={tint} />
    </Svg>
  );
}
