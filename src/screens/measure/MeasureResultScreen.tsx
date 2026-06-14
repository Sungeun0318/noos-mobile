import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { EegBands, RecognitionAxisDetail, RecognitionDetail } from '@/api/types';
import { EmptyState } from '@/components/EmptyState';
import { PlanetHero } from '@/components/PlanetHero';
import { PlanetImage } from '@/components/PlanetImage';
import { ScreenBackdrop } from '@/components/backdrop/ScreenBackdrop';
import { StateAxisChart } from '@/components/StateAxisChart';
import { Button, Card } from '@/components/ui';
import { noosTelemetry } from '@/lib/telemetry';
import {
  confidenceLabel,
  orderedRecognitionAxes,
  primaryRecognitionAxes,
  qualityMessage,
  recognitionAxisLabels,
  recognitionLevelLabel,
  scorePercent,
  secondaryRecognitionAxes,
  shouldShowEegBands,
} from '@/screens/measure/measureResultLogic';
import { useStateStore } from '@/stores/stateStore';
import { color, PLANET_COLORS, PLANETS, radius, space, type, type PlanetId } from '@/theme';

type ResultNavigation = {
  getParent: () => { navigate: (screen: 'Journey' | 'Measure') => void } | undefined;
  navigate: (screen: 'Measure/Manual') => void;
};

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
      <ScreenBackdrop>
        <View style={[styles.empty, { paddingTop: insets.top + space.xl }]}>
          <EmptyState
            action={<Button label="다시 측정하기" onPress={() => navigation.navigate('Measure/Manual')} />}
            body="다시 측정하면 추천 행성을 만들 수 있어요."
            planet="earth"
            title="결과를 받지 못했어요"
          />
        </View>
      </ScreenBackdrop>
    );
  }

  const recommendedPlanet = state.recommendedPlanet;
  const currentState = state.currentState;
  const recognition = state.recognition;
  const showRecognition = !!recognition;
  const showEegBands = shouldShowEegBands(state.source, state.eegBands);

  function goJourney(planet: PlanetId) {
    noosTelemetry.track('measure_result_start_tap', { planet });
    // TODO FE-06: navigate PlanetSelect and seed session draft when Journey stack exists.
    navigation.getParent()?.navigate('Journey');
  }

  const confidence = state.confidence ?? 0;

  return (
    <ScreenBackdrop planet={recommendedPlanet}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + space['6xl'],
          },
        ]}
      >
        <PlanetHero planet={recommendedPlanet}>
          <Text style={styles.label}>측정 결과</Text>
          <View style={styles.titleRow}>
            <Text style={styles.stateLabel}>{state.stateLabel ?? '상태 결과'}</Text>
            {recognition?.dominantState ? (
              <Text style={styles.dominantState}>{recognition.dominantState}</Text>
            ) : null}
            {confidence < 0.4 ? <Text style={styles.lowConfidence}>(자신 없음)</Text> : null}
          </View>
          <View style={styles.badgeRow}>
            <SourceBadge source={state.source} />
            <Text style={styles.confidence}>신뢰도 {Math.round(confidence * 100)}%</Text>
            {recognition?.quality ? (
              <Text style={styles.confidence}>
                해석 {recognition.quality.usable ? '가능' : '주의'} · {scorePercent(recognition.quality.score)}
              </Text>
            ) : null}
          </View>
        </PlanetHero>

        {showRecognition ? (
          <RecognitionResultBlocks recognition={recognition} planet={recommendedPlanet} />
        ) : (
          <>
            <StateAxisChart values={currentState} />
            {showEegBands && state.eegBands ? (
              <EegBandsChart bands={state.eegBands} planet={recommendedPlanet} />
            ) : null}
          </>
        )}
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
    </ScreenBackdrop>
  );
}

function RecognitionResultBlocks({ recognition, planet }: { recognition: RecognitionDetail; planet: PlanetId }) {
  const primaryAxes = orderedRecognitionAxes(recognition, primaryRecognitionAxes);
  const secondaryAxes = orderedRecognitionAxes(recognition, secondaryRecognitionAxes);

  return (
    <>
      <RecognitionAxesSection
        axes={primaryAxes}
        description="현재 행동과 가장 직접적으로 연결되는 지표예요."
        planet={planet}
        title="주요 상태"
      />
      <RecognitionAxesSection
        axes={secondaryAxes}
        description="주요 판단을 보조하는 상태 흐름이에요."
        planet={planet}
        title="보조 지표"
      />
      {recognition.bands ? <EegBandsChart bands={recognition.bands} planet={planet} /> : null}
      <RecognitionQualityCard recognition={recognition} />
    </>
  );
}

function RecognitionAxesSection({
  axes,
  description,
  planet,
  title,
}: {
  axes: RecognitionAxisDetail[];
  description: string;
  planet: PlanetId;
  title: string;
}) {
  if (axes.length === 0) {
    return null;
  }

  return (
    <View style={styles.sectionStack}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.bodyText}>{description}</Text>
      </View>
      <View style={styles.axisGrid}>
        {axes.map((axis) => (
          <RecognitionAxisCard axis={axis} key={axis.key} planet={planet} />
        ))}
      </View>
    </View>
  );
}

function RecognitionAxisCard({ axis, planet }: { axis: RecognitionAxisDetail; planet: PlanetId }) {
  const percent = scorePercent(axis.score);
  const confidence = scorePercent(axis.confidence);

  return (
    <Card level={2} padding="lg" planetTint={planet} variant="glass">
      <View style={styles.axisCardStack}>
        <View style={styles.axisTopRow}>
          <Text style={styles.axisLabel}>{recognitionAxisLabels[axis.key]}</Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>{recognitionLevelLabel(axis.level)}</Text>
          </View>
        </View>
        <View style={styles.axisScoreRow}>
          <Text style={styles.axisScore}>{percent}</Text>
          <Text style={styles.axisScoreMeta}>/100</Text>
        </View>
        <Text style={styles.rationale} numberOfLines={2}>
          {axis.rationale || '이번 측정에서 이 지표를 보조 근거로 확인했어요.'}
        </Text>
        <View style={styles.confidenceBarTrack}>
          <View
            style={[
              styles.confidenceBarFill,
              {
                backgroundColor: PLANET_COLORS[planet].secondary,
                flex: confidence,
              },
            ]}
          />
          <View style={{ flex: 100 - confidence }} />
        </View>
        <Text style={styles.axisConfidence}>축 신뢰도 {confidenceLabel(axis.confidence)}</Text>
      </View>
    </Card>
  );
}

function RecognitionQualityCard({ recognition }: { recognition: RecognitionDetail }) {
  const quality = recognition.quality;

  if (!quality) {
    return null;
  }

  return (
    <Card level={2} padding="lg" variant="glass">
      <View style={styles.qualityStack}>
        <View style={styles.chartHeader}>
          <View style={styles.chartCopy}>
            <Text style={styles.sectionTitle}>신뢰도와 한계</Text>
            <Text style={styles.bodyText}>{qualityMessage(recognition)}</Text>
          </View>
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceBadgeText}>{quality.usable ? '해석 가능' : '주의'}</Text>
          </View>
        </View>
        <View style={styles.qualityScoreRow}>
          <Text style={styles.qualityScore}>{scorePercent(quality.score)}</Text>
          <Text style={styles.qualityScoreMeta}>측정 신뢰도 · {confidenceLabel(quality.score)}</Text>
        </View>
        {quality.warnings.length > 0 ? (
          <View style={styles.warningStack}>
            {quality.warnings.map((warning) => (
              <Text key={warning} style={styles.warningText}>
                {warning}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const eegBandLabels: Array<{ key: keyof EegBands; label: string }> = [
  { key: 'delta', label: 'Delta' },
  { key: 'theta', label: 'Theta' },
  { key: 'alpha', label: 'Alpha' },
  { key: 'beta', label: 'Beta' },
  { key: 'gamma', label: 'Gamma' },
];

function EegBandsChart({ bands, planet }: { bands: EegBands; planet: PlanetId }) {
  const values = eegBandLabels.map(({ key }) => bands[key]);
  const maxValue = Math.max(...values, 1);
  const isRelative = values.every((value) => value >= 0 && value <= 1);

  return (
    <Card level={2} padding="lg" variant="glass">
      <View style={styles.chartStack}>
        <View style={styles.chartHeader}>
          <View style={styles.chartCopy}>
            <Text style={styles.sectionTitle}>뇌파 밴드 근거</Text>
            <Text style={styles.bodyText}>Delta, Theta, Alpha, Beta, Gamma의 상대 분포예요.</Text>
          </View>
          <Text style={styles.chartMeta}>상대값</Text>
        </View>
        <View style={styles.bandStack}>
          {eegBandLabels.map(({ key, label }) => {
            const value = bands[key];
            const ratio = Math.max(0, Math.min(value / maxValue, 1));

            return (
              <View key={key} style={styles.bandRow}>
                <Text style={styles.bandLabel}>{label}</Text>
                <View style={styles.bandTrack}>
                  <View
                    style={[
                      styles.bandFill,
                      {
                        backgroundColor: PLANET_COLORS[planet].secondary,
                        flex: ratio,
                      },
                    ]}
                  />
                  <View style={{ flex: 1 - ratio }} />
                </View>
                <Text style={styles.bandValue}>{isRelative ? scorePercent(value) : Math.round(value)}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </Card>
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

function RecommendedPlanetCard({ planet }: { planet: PlanetId }) {
  const meta = PLANETS[planet];

  return (
    <Card level={2} padding="xl" planetTint={planet} variant="glass">
      <View style={styles.planetRow}>
        <View style={styles.planetCopy}>
          <Text style={styles.label}>추천 행성</Text>
          <Text style={styles.cardTitle}>{meta.title}</Text>
          <Text style={styles.bodyText}>{meta.description}</Text>
        </View>
        <PlanetImage planet={planet} round size={orbSize} style={styles.planetImage} />
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
  axisCardStack: {
    gap: space.md,
  },
  axisConfidence: {
    color: color.text.tertiary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    lineHeight: type.caption.lineHeight,
  },
  axisGrid: {
    gap: space.md,
  },
  axisLabel: {
    color: color.text.secondary,
    flex: 1,
    fontFamily: type.bodyMd.family,
    fontSize: type.bodyMd.size,
    fontWeight: type.bodyMd.weight,
    lineHeight: type.bodyMd.lineHeight,
  },
  axisScore: {
    color: color.text.primary,
    fontFamily: type.display.family,
    fontSize: type.display.size,
    fontWeight: type.display.weight,
    lineHeight: type.display.lineHeight,
  },
  axisScoreMeta: {
    color: color.text.tertiary,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
  },
  axisScoreRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: space.xs,
  },
  axisTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
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
  confidenceBarFill: {
    borderRadius: radius.pill,
  },
  confidenceBarTrack: {
    backgroundColor: color.bg.elevated,
    borderRadius: radius.pill,
    flexDirection: 'row',
    height: space.xs,
    overflow: 'hidden',
  },
  dominantState: {
    color: color.text.secondary,
    fontFamily: type.bodyMd.family,
    fontSize: type.bodyMd.size,
    fontWeight: type.bodyMd.weight,
    lineHeight: type.bodyMd.lineHeight,
  },
  bandFill: {
    borderRadius: radius.pill,
  },
  bandLabel: {
    color: color.text.secondary,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
    width: space['5xl'],
  },
  bandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  bandStack: {
    gap: space.md,
  },
  bandTrack: {
    backgroundColor: color.bg.elevated,
    borderRadius: radius.pill,
    flex: 1,
    flexDirection: 'row',
    height: space.sm,
    overflow: 'hidden',
  },
  bandValue: {
    color: color.text.tertiary,
    fontFamily: type.tabular.family,
    fontSize: type.tabular.size,
    fontWeight: type.tabular.weight,
    lineHeight: type.tabular.lineHeight,
    textAlign: 'right',
    width: space['4xl'],
  },
  chartCopy: {
    flex: 1,
    gap: space.xs,
  },
  chartHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.lg,
    justifyContent: 'space-between',
  },
  chartMeta: {
    color: color.text.tertiary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    lineHeight: type.caption.lineHeight,
  },
  chartStack: {
    gap: space.lg,
  },
  content: {
    gap: space.xl,
    padding: space.xl,
  },
  empty: {
    flex: 1,
    gap: space.lg,
    justifyContent: 'center',
    padding: space.xl,
  },
  label: {
    color: color.text.tertiary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    letterSpacing: 0.4,
    lineHeight: type.caption.lineHeight,
  },
  levelBadge: {
    backgroundColor: color.bg.elevated,
    borderColor: color.border.default,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  levelBadgeText: {
    color: color.text.primary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
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
  planetImage: {
    borderColor: color.border.default,
    borderWidth: StyleSheet.hairlineWidth,
  },
  planetRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.lg,
  },
  qualityScore: {
    color: color.text.primary,
    fontFamily: type.h1.family,
    fontSize: type.h1.size,
    fontWeight: type.h1.weight,
    lineHeight: type.h1.lineHeight,
  },
  qualityScoreMeta: {
    color: color.text.secondary,
    flex: 1,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
  },
  qualityScoreRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
  },
  qualityStack: {
    gap: space.lg,
  },
  rationale: {
    color: color.text.secondary,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
  },
  sectionHeader: {
    gap: space.xs,
  },
  sectionStack: {
    gap: space.md,
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
  warningStack: {
    gap: space.xs,
  },
  warningText: {
    color: color.text.tertiary,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
  },
});
