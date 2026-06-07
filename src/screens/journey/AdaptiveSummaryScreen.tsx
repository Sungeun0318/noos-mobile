import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenBackdrop } from '@/components/backdrop/ScreenBackdrop';
import { EmptyState } from '@/components/EmptyState';
import { PlanetHero } from '@/components/PlanetHero';
import { Button, Card } from '@/components/ui';
import { noosTelemetry } from '@/lib/telemetry';
import type { JourneyStackParamList } from '@/navigation/JourneyStack';
import { buildAdaptiveSummaryData, type AdaptiveAxisChange } from '@/screens/journey/adaptiveSummaryData';
import { useAdaptiveSessionStore } from '@/stores/adaptiveSessionStore';
import { color, radius, space, type } from '@/theme';

type AdaptiveSummaryProps = NativeStackScreenProps<JourneyStackParamList, 'Journey/AdaptiveSummary'>;

export function AdaptiveSummaryScreen({ navigation, route }: AdaptiveSummaryProps) {
  const insets = useSafeAreaInsets();
  const session = useAdaptiveSessionStore((state) => state.session);
  const segments = useAdaptiveSessionStore((state) => state.segments);
  const recentWindows = useAdaptiveSessionStore((state) => state.recentWindows);
  const clearAdaptiveSession = useAdaptiveSessionStore((state) => state.clear);
  const activeMatchesRoute = session?.sessionId === route.params.sessionId;
  const summarySession = useMemo(
    () => (session ? { ...session, recentWindows, segments } : null),
    [recentWindows, segments, session],
  );
  const summary = useMemo(
    () => (summarySession ? buildAdaptiveSummaryData(summarySession) : null),
    [summarySession],
  );

  useEffect(() => {
    if (summary) {
      noosTelemetry.track('adaptive_summary_view', {
        adjustmentCount: summary.adjustmentCount,
        segmentCount: summary.segmentCount,
        sessionId: summary.sessionId,
      });
    }
  }, [summary]);

  function goToday() {
    clearAdaptiveSession();
    navigation.getParent()?.navigate('Today');
  }

  function goHistory() {
    clearAdaptiveSession();
    navigation.getParent()?.navigate('History');
  }

  if (!activeMatchesRoute || !summary) {
    return (
      <ScreenBackdrop>
        <View style={[styles.empty, { paddingTop: insets.top + space['3xl'] }]}>
          <EmptyState
            action={<Button label="History로 이동" onPress={goHistory} />}
            body="완료한 적응형 세션은 History에서 다시 확인할 수 있어요."
            title="요약할 세션이 없어요"
          />
        </View>
      </ScreenBackdrop>
    );
  }

  return (
    <ScreenBackdrop planet={summary.planet}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + space['6xl'],
            paddingTop: insets.top + space.xl,
          },
        ]}
        style={styles.container}
      >
        <PlanetHero imageSize={space['5xl']} planet={summary.planet}>
          <Text style={styles.eyebrow}>Adaptive Summary</Text>
          <Text style={styles.title}>{summary.planetTitle} 세션 요약</Text>
          <Text style={styles.bodyText}>
            EEG 흐름을 기준으로 음악 전환과 상태 변화를 정리했습니다.
          </Text>
        </PlanetHero>

        <View style={styles.statsGrid}>
          <SummaryStat label="총 시간" value={formatDuration(summary.totalDurationSec)} />
          <SummaryStat label="생성 음악" value={`${summary.generatedSegmentCount}개`} />
          <SummaryStat label="전환 조정" value={`${summary.adjustmentCount}회`} />
        </View>

        <Card level={1} padding="lg" variant="glass">
          <View style={styles.sectionStack}>
            <Text style={styles.cardTitle}>상태 변화</Text>
            {summary.axisChanges.length > 0 ? (
              <View style={styles.axisList}>
                {summary.axisChanges.slice(0, 4).map((change) => (
                  <AxisChangeRow change={change} key={change.key} />
                ))}
              </View>
            ) : (
              <Text style={styles.bodyText}>아직 비교할 EEG 윈도우가 부족합니다.</Text>
            )}
          </View>
        </Card>

        <Card level={1} padding="lg" variant="compact">
          <View style={styles.sectionStack}>
            <View style={styles.sectionHeader}>
              <Text style={styles.cardTitle}>음악 전환 타임라인</Text>
              <Text style={styles.metaText}>{summary.timeline.length}개 윈도우</Text>
            </View>
            {summary.timeline.length > 0 ? (
              <View style={styles.timelineList}>
                {summary.timeline.map((point) => (
                  <View key={point.windowId} style={styles.timelineRow}>
                    <View style={[styles.timelineDot, point.action === 'crossfade' && styles.timelineDotActive]} />
                    <View style={styles.timelineCopy}>
                      <Text style={styles.timelineTitle}>
                        {point.index + 1}번째 윈도우 · {point.label}
                      </Text>
                      <Text style={styles.metaText}>
                        {point.dominantBand ? `우세 밴드 ${point.dominantBand}` : '우세 밴드 없음'}
                        {' · '}
                        {point.signalOk ? '신호 양호' : '신호 낮음'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.bodyText}>세션 중 수집된 윈도우가 아직 없습니다.</Text>
            )}
          </View>
        </Card>

        <Card level={2} padding="lg" planetTint={summary.planet} variant="glass">
          <View style={styles.sectionStack}>
            <Text style={styles.cardTitle}>밴드 기록</Text>
            <Text style={styles.bodyText}>
              {summary.graphData.hasData
                ? `Alpha, Beta, Theta, Delta, Gamma 흐름 ${summary.graphData.timeline.length}개를 저장했습니다.`
                : '밴드 기록이 충분하지 않습니다.'}
            </Text>
          </View>
        </Card>

        <View style={styles.actions}>
          <Button fullWidth label="History에서 보기" onPress={goHistory} size="lg" />
          <Button fullWidth label="Today로 이동" onPress={goToday} size="lg" variant="secondary" />
        </View>
      </ScrollView>
    </ScreenBackdrop>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <Card level={1} padding="md" variant="glass" style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.metaText}>{label}</Text>
    </Card>
  );
}

function AxisChangeRow({ change }: { change: AdaptiveAxisChange }) {
  const percent = Math.round(Math.abs(change.value) * 100);

  return (
    <View style={styles.axisRow}>
      <View style={styles.axisCopy}>
        <Text style={styles.axisTitle}>{change.text}</Text>
        <Text style={styles.metaText}>
          {Math.round(change.from * 100)}% → {Math.round(change.to * 100)}%
        </Text>
      </View>
      <Text style={[styles.axisValue, change.direction === 'down' && styles.axisValueDown]}>
        {change.direction === 'flat' ? '유지' : `${percent}%`}
      </Text>
    </View>
  );
}

function formatDuration(durationSec: number) {
  if (durationSec < 60) {
    return `${durationSec}초`;
  }

  return `${Math.round(durationSec / 60)}분`;
}

const styles = StyleSheet.create({
  actions: {
    gap: space.md,
  },
  axisCopy: {
    flex: 1,
    gap: space.xs,
    minWidth: 0,
  },
  axisList: {
    gap: space.md,
  },
  axisRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  axisTitle: {
    color: color.text.primary,
    fontFamily: type.bodyMd.family,
    fontSize: type.bodyMd.size,
    fontWeight: type.bodyMd.weight,
    lineHeight: type.bodyMd.lineHeight,
  },
  axisValue: {
    color: color.brand.accent,
    fontFamily: type.tabular.family,
    fontSize: type.tabular.size,
    fontWeight: type.tabular.weight,
    lineHeight: type.tabular.lineHeight,
  },
  axisValueDown: {
    color: color.state.info,
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
    fontFamily: type.h3.family,
    fontSize: type.h3.size,
    fontWeight: type.h3.weight,
    lineHeight: type.h3.lineHeight,
  },
  container: {
    backgroundColor: 'transparent',
  },
  content: {
    gap: space.lg,
    paddingHorizontal: space.xl,
  },
  empty: {
    flex: 1,
    gap: space.lg,
    justifyContent: 'center',
    padding: space.xl,
  },
  eyebrow: {
    color: color.text.tertiary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    letterSpacing: 0,
    lineHeight: type.caption.lineHeight,
  },
  metaText: {
    color: color.text.tertiary,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  sectionStack: {
    gap: space.md,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
  },
  statValue: {
    color: color.text.primary,
    fontFamily: type.h2.family,
    fontSize: type.h2.size,
    fontWeight: type.h2.weight,
    lineHeight: type.h2.lineHeight,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: space.sm,
  },
  timelineCopy: {
    flex: 1,
    gap: space.xs,
    minWidth: 0,
  },
  timelineDot: {
    backgroundColor: color.bg.elevated,
    borderColor: color.border.default,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: space.md,
    marginTop: space.xs,
    width: space.md,
  },
  timelineDotActive: {
    backgroundColor: color.brand.accent,
  },
  timelineList: {
    gap: space.md,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: space.md,
  },
  timelineTitle: {
    color: color.text.primary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
  },
  title: {
    color: color.text.primary,
    fontFamily: type.h1.family,
    fontSize: type.h1.size,
    fontWeight: type.h1.weight,
    lineHeight: type.h1.lineHeight,
  },
});
