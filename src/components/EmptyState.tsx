import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PlanetImage } from '@/components/PlanetImage';
import { Card } from '@/components/ui';
import { color, PLANETS, space, type, type PlanetId } from '@/theme';

interface EmptyStateProps {
  title: string;
  body: string;
  planet?: PlanetId;
  action?: ReactNode;
}

export function EmptyState({ title, body, planet = 'neptune', action }: EmptyStateProps) {
  return (
    <Card level={2} padding="xl" planetTint={planet} variant="glass">
      <View style={styles.container}>
        <PlanetImage planet={planet} round size={space['6xl']} style={styles.planet} />
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>{PLANETS[planet].title}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
        </View>
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  action: {
    alignSelf: 'stretch',
  },
  body: {
    color: color.text.secondary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
    textAlign: 'center',
  },
  container: {
    alignItems: 'center',
    gap: space.lg,
  },
  copy: {
    alignItems: 'center',
    gap: space.xs,
  },
  eyebrow: {
    color: color.text.tertiary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    letterSpacing: 0.4,
    lineHeight: type.caption.lineHeight,
    textTransform: 'uppercase',
  },
  planet: {
    borderColor: color.border.default,
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: {
    color: color.text.primary,
    fontFamily: type.h2.family,
    fontSize: type.h2.size,
    fontWeight: type.h2.weight,
    lineHeight: type.h2.lineHeight,
    textAlign: 'center',
  },
});
