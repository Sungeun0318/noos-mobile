import { StyleSheet, Text, View } from 'react-native';

import type { CurrentState } from '@/api/types';
import { Card } from '@/components/ui';
import { color, radius, space, type } from '@/theme';

const axisLabels: Record<keyof CurrentState, string> = {
  cortical_arousal: '각성',
  fatigue_risk: '피로 위험',
  focus_readiness: '집중 준비',
  mental_workload: '인지 부하',
  relaxation_level: '이완',
  stress_load: '스트레스',
};

export function StateAxisChart({ values }: { values: CurrentState }) {
  return (
    <Card level={1} padding="lg">
      <View style={styles.axisList}>
        {Object.entries(axisLabels).map(([key, label]) => {
          const value = values[key as keyof CurrentState];

          return (
            <View key={key} style={styles.axisRow}>
              <View style={styles.axisHeader}>
                <Text style={styles.axisLabel}>{label}</Text>
                <Text style={styles.axisValue}>{Math.round(value * 100)}%</Text>
              </View>
              <View style={styles.axisTrack}>
                <View style={[styles.axisFill, { width: `${Math.round(value * 100)}%` }]} />
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  axisFill: {
    backgroundColor: color.brand.accent,
    borderRadius: radius.pill,
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  axisHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisLabel: {
    color: color.text.secondary,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
  },
  axisList: {
    gap: space.md,
  },
  axisRow: {
    gap: space.xs,
  },
  axisTrack: {
    backgroundColor: color.bg.elevated,
    borderRadius: radius.pill,
    height: space.sm,
    overflow: 'hidden',
  },
  axisValue: {
    color: color.text.tertiary,
    fontFamily: type.tabular.family,
    fontSize: type.tabular.size,
    fontWeight: type.tabular.weight,
    lineHeight: type.tabular.lineHeight,
  },
});
