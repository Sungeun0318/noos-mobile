import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BrandBackdrop } from '@/components/backdrop/BrandBackdrop';
import { NoosLogo } from '@/components/brand/NoosLogo';
import { noosTelemetry } from '@/lib/telemetry';
import { color, space, type } from '@/theme';

export function SplashScreen() {
  useEffect(() => {
    noosTelemetry.track('splash_view');
  }, []);

  return (
    <BrandBackdrop style={styles.container}>
      <View style={styles.center}>
        <NoosLogo size={logoSize} />
        <View style={styles.lockup}>
          <Text style={styles.logoText}>NOOS</Text>
          <Text style={styles.tagline}>EEG 기반 컨디션 조절</Text>
        </View>
      </View>
    </BrandBackdrop>
  );
}

const logoSize = space['6xl'] + space.xl;
const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    gap: space.xl,
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  lockup: {
    alignItems: 'center',
    gap: space.xs,
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
