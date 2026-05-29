import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card } from '@/components/ui';
import { noosTelemetry } from '@/lib/telemetry';
import { useStateStore } from '@/stores/stateStore';
import { color, PLANET_COLORS, PLANETS, radius, space, type, type PlanetId } from '@/theme';

type ResultNavigation = {
  getParent: () => { navigate: (screen: 'Journey' | 'Measure') => void } | undefined;
  navigate: (screen: 'Measure/Manual') => void;
};

const axisLabels = {
  focus_readiness: '집중 준비',
  stress_load: '스트레스',
  fatigue_risk: '피로 위험',
  relaxation_level: '이완',
  cortical_arousal: '각성',
  mental_workload: '인지 부하',
} as const;

export function MeasureResultScreen() {
  const navigation = useNavigation<ResultNavigation>();
  const insets = useSafeAreaInsets();
  const state = useStateStore();

  useEffect(() => {
    if (state.source && state.confidence !== null) {
      noosTelemetry.track('measure_result_view', {
        source: state.source,
        confidence: state.confidence,
      });
    }
  }, [state.source, state.confidence]);

  if (!state.currentState || !state.recommendedPlanet) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top + space.xl }]}>
        <Text style={styles.title}>결과를 받지 못했어요</Text>
        <Text style={styles.bodyText}>다시 측정하면 추천 행성을 만들 수 있어요.</Text>
        <Button label="다시 측정하기" onPress={() => navigation.navigate('Measure/Manual')} />
      </View>
    );
  }

  const recommendedPlanet = state.recommendedPlanet;
  const currentState = state.currentState;

  function goJourney(planet: PlanetId) {
    noosTelemetry.track('measure_result_start_tap', { planet });
    // TODO FE-06: navigate PlanetSelect and seed session draft when Journey stack exists.
    navigation.getParent()?.navigate('Journey');
  }

  const confidence = state.confidence ?? 0;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        {
          paddingBottom: insets.bottom + space['6xl'],
        },
      ]}
      style={styles.container}
    >
      <Card level={2} padding="xl">
        <View style={styles.hero}>
          <Text style={styles.label}>측정 결과</Text>
          <View style={styles.titleRow}>
            <Text style={styles.stateLabel}>{state.stateLabel}</Text>
            {confidence < 0.4 ? <Text style={styles.lowConfidence}>(자신 없음)</Text> : null}
          </View>
          <View style={styles.badgeRow}>
            <SourceBadge source={state.source} />
            <Text style={styles.confidence}>신뢰도 {Math.round(confidence * 100)}%</Text>
          </View>
        </View>
      </Card>

      <StateAxisChart values={currentState} />
      <RecommendedPlanetCard planet={recommendedPlanet} />
      <AlternatesRow planets={state.alternates} />

      <View style={styles.actions}>
        <Button
          fullWidth
          label="이 행성으로 세션 시작"
          onPress={() => goJourney(recommendedPlanet)}
          size="lg"
        />
        <Button
          fullWidth
          label="다른 행성 보기"
          onPress={() => goJourney(recommendedPlanet)}
          variant="secondary"
        />
      </View>
    </ScrollView>
  );
}

function SourceBadge({ source }: { source: string | null }) {
  const label = source === 'eeg' ? 'EEG' : source === 'hybrid' ? '설문+EEG' : '설문';

  return (
    <View style={styles.sourceBadge}>
      <Text style={styles.sourceBadgeText}>{label}</Text>
    </View>
  );
}

function StateAxisChart({ values }: { values: NonNullable<ReturnType<typeof useStateStore.getState>['currentState']> }) {
  return (
    <Card level={1} padding="lg">
      <View style={styles.axisList}>
        {Object.entries(axisLabels).map(([key, label]) => {
          const value = values[key as keyof typeof axisLabels];

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

function RecommendedPlanetCard({ planet }: { planet: PlanetId }) {
  const meta = PLANETS[planet];

  return (
    <Card level={2} padding="xl" planetTint={planet}>
      <View style={styles.planetRow}>
        <View style={styles.planetCopy}>
          <Text style={styles.label}>추천 행성</Text>
          <Text style={styles.cardTitle}>{meta.title}</Text>
          <Text style={styles.bodyText}>{meta.description}</Text>
        </View>
        <View style={[styles.planetOrb, { backgroundColor: PLANET_COLORS[planet].secondary }]} />
      </View>
    </Card>
  );
}

function AlternatesRow({ planets }: { planets: PlanetId[] }) {
  if (planets.length === 0) {
    return null;
  }

  return (
    <View style={styles.alternates}>
      <Text style={styles.sectionTitle}>다른 후보</Text>
      <View style={styles.alternateRow}>
        {planets.slice(0, 3).map((planet) => (
          <View key={planet} style={styles.alternatePill}>
            <Text style={styles.alternateText}>{PLANETS[planet].title}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const orbSize = space['5xl'];

const styles = StyleSheet.create({
  actions: {
    gap: space.md,
  },
  alternatePill: {
    backgroundColor: color.bg.surfaceAlt,
    borderColor: color.border.default,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  alternateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  alternateText: {
    color: color.text.primary,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
  },
  alternates: {
    gap: space.sm,
  },
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
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  bodyText: {
    color: color.text.secondary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
  },
  cardTitle: {
    color: color.text.primary,
    fontFamily: type.h2.family,
    fontSize: type.h2.size,
    fontWeight: type.h2.weight,
    lineHeight: type.h2.lineHeight,
  },
  confidence: {
    color: color.text.tertiary,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
  },
  container: {
    backgroundColor: color.bg.base,
  },
  content: {
    gap: space.lg,
    padding: space.xl,
  },
  empty: {
    backgroundColor: color.bg.base,
    flex: 1,
    gap: space.lg,
    justifyContent: 'center',
    padding: space.xl,
  },
  hero: {
    gap: space.md,
  },
  label: {
    color: color.text.tertiary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    letterSpacing: 0.4,
    lineHeight: type.caption.lineHeight,
  },
  lowConfidence: {
    color: color.text.tertiary,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
  },
  planetCopy: {
    flex: 1,
    gap: space.xs,
  },
  planetOrb: {
    borderRadius: orbSize / 2,
    height: orbSize,
    opacity: 0.88,
    width: orbSize,
  },
  planetRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.lg,
  },
  sectionTitle: {
    color: color.text.secondary,
    fontFamily: type.h3.family,
    fontSize: type.h3.size,
    fontWeight: type.h3.weight,
    lineHeight: type.h3.lineHeight,
  },
  sourceBadge: {
    backgroundColor: color.bg.surfaceAlt,
    borderColor: color.border.default,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  sourceBadgeText: {
    color: color.text.primary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    lineHeight: type.caption.lineHeight,
  },
  stateLabel: {
    color: color.text.primary,
    fontFamily: type.display.family,
    fontSize: type.display.size,
    fontWeight: type.display.weight,
    lineHeight: type.display.lineHeight,
  },
  title: {
    color: color.text.primary,
    fontFamily: type.h1.family,
    fontSize: type.h1.size,
    fontWeight: type.h1.weight,
    lineHeight: type.h1.lineHeight,
  },
  titleRow: {
    gap: space.xs,
  },
});
