import { StyleSheet, Text, View } from 'react-native';

import { color, space, type } from '@/theme';

export function SplashScreen() {
  return (
    <View style={styles.container}>
      <View accessibilityLabel="NOOS logo" accessibilityRole="image" style={styles.logoMark} />
      <Text style={styles.logoText}>NOOS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: color.bg.base,
    flex: 1,
    gap: space.lg,
    justifyContent: 'center',
  },
  logoMark: {
    backgroundColor: color.brand.noos,
    borderRadius: 40,
    height: 80,
    opacity: 0.92,
    width: 80,
  },
  logoText: {
    color: color.brand.noos,
    fontFamily: type.display.family,
    fontSize: type.display.size,
    fontWeight: type.display.weight,
    letterSpacing: 0,
    lineHeight: type.display.lineHeight,
  },
});
