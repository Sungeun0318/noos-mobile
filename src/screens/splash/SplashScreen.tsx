import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { NoosLogo } from '@/components/brand/NoosLogo';
import { noosTelemetry } from '@/lib/telemetry';
import { color, space, type } from '@/theme';

export function SplashScreen() {
  useEffect(() => {
    noosTelemetry.track('splash_view');
  }, []);

  return (
    <LinearGradient
      colors={[color.bg.base, color.bg.surfaceAlt, color.bg.base]}
      locations={[0, 0.52, 1]}
      style={styles.container}
    >
      <View style={styles.center}>
        <NoosLogo size={logoSize} />
        <Text style={styles.logoText}>NOOS</Text>
        <Text style={styles.tagline}>EEG 기반 컨디션 조절</Text>
      </View>
    </LinearGradient>
  );
}

const logoSize = space['5xl'] + space['2xl'];
const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    gap: space.lg,
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logoText: {
    color: color.brand.noos,
    fontFamily: type.display.family,
    fontSize: type.display.size,
    fontWeight: type.display.weight,
    letterSpacing: 0,
    lineHeight: type.display.lineHeight,
  },
  tagline: {
    color: color.text.secondary,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    letterSpacing: 0,
    lineHeight: type.small.lineHeight,
  },
});
