import { Platform, StyleSheet } from 'react-native';
import { Easing } from 'react-native-reanimated';

export const color = {
  bg: {
    base: '#0A0B12',
    surface: '#12131C',
    surfaceAlt: '#181A26',
    elevated: '#1F2233',
    glass: 'rgba(18, 19, 28, 0.78)',
    hero: 'rgba(31, 34, 51, 0.84)',
    overlay: 'rgba(10, 11, 18, 0.72)',
  },
  text: {
    primary: '#F4F5FA',
    secondary: '#B7BACB',
    tertiary: '#7A7E92',
    inverse: '#0A0B12',
    disabled: '#4A4D5E',
  },
  border: {
    subtle: 'rgba(255, 255, 255, 0.06)',
    default: 'rgba(255, 255, 255, 0.12)',
    strong: 'rgba(255, 255, 255, 0.22)',
  },
  state: {
    success: '#4ADE80',
    warning: '#FACC15',
    danger: '#F87171',
    info: '#7DD3FC',
  },
  brand: {
    noos: '#F4F1E8',
    accent: '#9D8DFF',
  },
} as const;

export const space = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 56,
  '6xl': 72,
} as const;

export const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 28,
  pill: 999,
} as const;

export const font = {
  sans: Platform.select({ ios: 'System', android: 'Roboto', default: 'System' }),
  serifKo: 'GowunBatang',
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
} as const;

export const type = {
  display: { family: font.sans, size: 32, lineHeight: 38, weight: '700' },
  h1: { family: font.sans, size: 26, lineHeight: 32, weight: '700' },
  h2: { family: font.sans, size: 20, lineHeight: 26, weight: '600' },
  h3: { family: font.sans, size: 17, lineHeight: 22, weight: '600' },
  body: { family: font.sans, size: 15, lineHeight: 22, weight: '400' },
  bodyMd: { family: font.sans, size: 15, lineHeight: 22, weight: '500' },
  small: { family: font.sans, size: 13, lineHeight: 18, weight: '400' },
  caption: { family: font.sans, size: 11, lineHeight: 14, weight: '500' },
  tabular: { family: font.mono, size: 15, lineHeight: 22, weight: '500' },
} as const;

export const elevation = {
  0: { backgroundColor: color.bg.base, borderWidth: 0 },
  1: {
    backgroundColor: color.bg.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.subtle,
  },
  2: {
    backgroundColor: color.bg.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.default,
  },
  3: {
    backgroundColor: color.bg.elevated,
    borderWidth: 1,
    borderColor: color.border.default,
  },
} as const;

export const motion = {
  duration: {
    xfast: 120,
    fast: 180,
    base: 220,
    slow: 320,
    slower: 480,
    pulse: 1200,
    wave: 960,
    ambient: 9000,
  },
  stagger: {
    waveBar: 70,
  },
  easing: {
    standard: Easing.bezier(0.2, 0, 0, 1),
    decel: Easing.bezier(0, 0, 0.2, 1),
    accel: Easing.bezier(0.4, 0, 1, 1),
  },
} as const;
