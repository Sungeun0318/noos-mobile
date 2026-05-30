import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { shouldShowOfflineBanner, useNetworkStatus } from '@/lib/netinfo';
import { color, space, type } from '@/theme';

const graceMs = 5000;

export function OfflineBanner() {
  const { status, offlineSince } = useNetworkStatus();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (status !== 'offline' || offlineSince === null) {
      setNow(Date.now());
      return undefined;
    }

    const remaining = Math.max(graceMs - (Date.now() - offlineSince), 0);
    const timer = setTimeout(() => {
      setNow(Date.now());
    }, remaining);

    return () => {
      clearTimeout(timer);
    };
  }, [offlineSince, status]);

  if (!shouldShowOfflineBanner(status, offlineSince, now, graceMs)) {
    return null;
  }

  return (
    <View accessibilityRole="alert" style={styles.container}>
      <Text style={styles.text}>오프라인입니다 · 일부 기능이 제한돼요</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: color.state.warning,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  text: {
    color: color.text.inverse,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
    textAlign: 'center',
  },
});
