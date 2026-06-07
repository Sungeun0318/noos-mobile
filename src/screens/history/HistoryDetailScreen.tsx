import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { PlanetHero } from '@/components/PlanetHero';
import { StateAxisChart } from '@/components/StateAxisChart';
import { ScreenBackdrop } from '@/components/backdrop/ScreenBackdrop';
import { Button, Card } from '@/components/ui';
import { noosTelemetry } from '@/lib/telemetry';
import type { HistoryStackParamList } from '@/navigation/HistoryStack';
import { getHistory } from '@/screens/history/historyGateway';
import { activeFromHistorySession } from '@/screens/history/historyTransforms';
import { useHistoryStore, type HistorySession } from '@/stores/historyStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { color, PLANETS, radius, space, type } from '@/theme';

type HistoryDetailProps = NativeStackScreenProps<HistoryStackParamList, 'History/Detail'>;

export function HistoryDetailScreen({ navigation, route }: HistoryDetailProps) {
  const insets = useSafeAreaInsets();
  const simulationMode = useSettingsStore((state) => state.simulationMode);
  const mode = simulationMode ? 'mock' : 'real';
  const localSession = useHistoryStore((state) => state.getById(route.params.sessionId));
  const detailQuery = useQuery({
    queryFn: () => getHistory(route.params.sessionId, mode),
    queryKey: ['history', 'detail', mode, route.params.sessionId],
    staleTime: 30_000,
  });
  const session = simulationMode ? localSession : detailQuery.data ?? null;
  const setActive = useSessionStore((state) => state.setActive);

  useEffect(() => {
    if (session) {
      noosTelemetry.track('history_detail_view', {
        planet: session.planet,
        sessionId: session.sessionId,
      });
    }
  }, [session]);

  function replaySession(historySession: HistorySession) {
    // TODO: audioId 만료 시 비활성.
    setActive(activeFromHistorySession(historySession));
    noosTelemetry.track('history_replay_tap', {
      planet: historySession.planet,
      sessionId: historySession.sessionId,
    });
    navigation.getParent()?.navigate('Journey', {
      params: { sessionId: historySession.sessionId },
      screen: 'Journey/Player',
    });
  }

  if (!simulationMode && detailQuery.isLoading) {
    return (
      <ScreenBackdrop planet="saturn">
        <View style={[styles.empty, { paddingTop: insets.top + space['3xl'] }]}>
          <EmptyState
            body="상세 기록을 확인하고 있습니다."
            planet="saturn"
            title="세션을 불러오는 중"
          />
        </View>
      </ScreenBackdrop>
    );
  }

  if (!session) {
    return (
      <ScreenBackdrop>
        <View style={[styles.empty, { paddingTop: insets.top + space['3xl'] }]}>
          <EmptyState
            action={<Button label="뒤로" onPress={navigation.goBack} />}
            body="기록이 삭제됐거나 아직 동기화되지 않았습니다."
            title="세션을 찾을 수 없어요"
          />
        </View>
      </ScreenBackdrop>
    );
  }

  const planet = PLANETS[session.planet];

  return (
    <ScreenBackdrop planet={session.planet}>
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
        <PlanetHero imageSize={space['5xl']} planet={session.planet}>
          <Text style={styles.eyebrow}>{planet.title}</Text>
          <Text style={styles.title}>{session.summary?.title ?? planet.trackName}</Text>
          {session.summary?.description ? (
            <Text style={styles.bodyText}>{session.summary.description}</Text>
          ) : null}
        </PlanetHero>

        <SessionMeta session={session} />
        <AudioMeta session={session} />
        {session.currentState ? (
          <View style={styles.sectionStack}>
            <Text style={styles.sectionTitle}>상태 축</Text>
            <StateAxisChart values={session.currentState} />
          </View>
        ) : null}
        <FeedbackBlock session={session} />
        <Button
          fullWidth
          label="다시 재생"
          onPress={() => replaySession(session)}
          size="lg"
        />
      </ScrollView>
    </ScreenBackdrop>
  );
}

function SessionMeta({ session }: { session: HistorySession }) {
  const adaptive = session.kind === 'adaptive';

  return (
    <Card level={1} padding="lg" variant="glass">
      <View style={styles.metaStack}>
        <Text style={styles.cardTitle}>세션 정보</Text>
        {adaptive ? <Text style={styles.kindText}>적응형 세션</Text> : null}
        <Text style={styles.bodyText}>
          {formatDateTime(session.completedAt)} · {Math.round(session.durationSec / 60)}분
        </Text>
        <Text style={styles.metaText}>{session.stateLabel ?? '상태 기록 없음'}</Text>
        {session.intentText ? <Text style={styles.metaText}>“{session.intentText}”</Text> : null}
      </View>
    </Card>
  );
}

function AudioMeta({ session }: { session: HistorySession }) {
  return (
    <Card level={1} padding="lg" variant="compact">
      <View style={styles.metaStack}>
        <Text style={styles.cardTitle}>오디오</Text>
        <Text style={styles.bodyText}>
          {session.audio ? `audioId ${session.audio.audioId}` : '오디오 정보 없음'}
        </Text>
        <Text style={styles.metaText}>
          재생 길이 {Math.round((session.audio?.durationSec ?? session.durationSec) / 60)}분
        </Text>
      </View>
    </Card>
  );
}

function FeedbackBlock({ session }: { session: HistorySession }) {
  return (
    <Card level={2} padding="lg" variant="glass">
      <View style={styles.metaStack}>
        <Text style={styles.cardTitle}>피드백</Text>
        {session.feedbackSummary ? (
          <View style={styles.feedbackRow}>
            <FeedbackPill label="음악" value={session.feedbackSummary.musicFit} />
            <FeedbackPill label="집중" value={session.feedbackSummary.focusResult} />
            {typeof session.feedbackSummary.transitionNatural === 'number' ? (
              <FeedbackPill label="전환" value={session.feedbackSummary.transitionNatural} />
            ) : null}
          </View>
        ) : (
          <Text style={styles.bodyText}>피드백 없음</Text>
        )}
      </View>
    </Card>
  );
}

function FeedbackPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.feedbackPill}>
      <Text style={styles.feedbackText}>
        {label} {Math.round(value * 100)}%
      </Text>
    </View>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ko-KR', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
}

const styles = StyleSheet.create({
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
  feedbackPill: {
    backgroundColor: color.bg.surfaceAlt,
    borderColor: color.border.default,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  feedbackRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  feedbackText: {
    color: color.text.primary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    lineHeight: type.caption.lineHeight,
  },
  kindText: {
    color: color.brand.accent,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    lineHeight: type.caption.lineHeight,
  },
  metaStack: {
    gap: space.sm,
  },
  metaText: {
    color: color.text.tertiary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
  },
  sectionStack: {
    gap: space.sm,
  },
  sectionTitle: {
    color: color.text.secondary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    letterSpacing: 0,
    lineHeight: type.caption.lineHeight,
  },
  title: {
    color: color.text.primary,
    fontFamily: type.h1.family,
    fontSize: type.h1.size,
    fontWeight: type.h1.weight,
    lineHeight: type.h1.lineHeight,
  },
});
