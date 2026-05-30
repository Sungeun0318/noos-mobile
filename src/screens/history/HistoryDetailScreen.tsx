import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StateAxisChart } from '@/components/StateAxisChart';
import { Button, Card } from '@/components/ui';
import { noosTelemetry } from '@/lib/telemetry';
import type { HistoryStackParamList } from '@/navigation/HistoryStack';
import { activeFromHistorySession } from '@/screens/history/historyTransforms';
import { useHistoryStore, type HistorySession } from '@/stores/historyStore';
import { useSessionStore } from '@/stores/sessionStore';
import { color, planetGradient, PLANET_COLORS, PLANETS, radius, space, type } from '@/theme';

type HistoryDetailProps = NativeStackScreenProps<HistoryStackParamList, 'History/Detail'>;

export function HistoryDetailScreen({ navigation, route }: HistoryDetailProps) {
  const insets = useSafeAreaInsets();
  // TODO: noosApi.sessions.get when backend wired.
  const session = useHistoryStore((state) => state.getById(route.params.sessionId));
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

  if (!session) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top + space['3xl'] }]}>
        <Text style={styles.title}>세션을 찾을 수 없어요</Text>
        <Text style={styles.bodyText}>기록이 삭제됐거나 아직 동기화되지 않았어.</Text>
        <Button label="뒤로" onPress={navigation.goBack} />
      </View>
    );
  }

  const planet = PLANETS[session.planet];
  const gradient = planetGradient(session.planet);

  return (
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
      <LinearGradient colors={gradient.colors} locations={gradient.locations} style={styles.hero}>
        <View style={[styles.planetOrb, { backgroundColor: PLANET_COLORS[session.planet].secondary }]} />
        <Text style={styles.eyebrow}>{planet.title}</Text>
        <Text style={styles.title}>{session.summary?.title ?? planet.trackName}</Text>
        {session.summary?.description ? (
          <Text style={styles.bodyText}>{session.summary.description}</Text>
        ) : null}
      </LinearGradient>

      <SessionMeta session={session} />
      {session.currentState ? <StateAxisChart values={session.currentState} /> : null}
      <FeedbackBlock session={session} />
      <Button
        fullWidth
        label="다시 재생"
        onPress={() => replaySession(session)}
        size="lg"
      />
    </ScrollView>
  );
}

function SessionMeta({ session }: { session: HistorySession }) {
  return (
    <Card level={1} padding="lg">
      <View style={styles.metaStack}>
        <Text style={styles.cardTitle}>세션 정보</Text>
        <Text style={styles.bodyText}>
          {formatDateTime(session.completedAt)} · {Math.round(session.durationSec / 60)}분
        </Text>
        <Text style={styles.metaText}>{session.stateLabel ?? '상태 기록 없음'}</Text>
        {session.intentText ? <Text style={styles.metaText}>“{session.intentText}”</Text> : null}
      </View>
    </Card>
  );
}

function FeedbackBlock({ session }: { session: HistorySession }) {
  return (
    <Card level={2} padding="lg">
      <View style={styles.metaStack}>
        <Text style={styles.cardTitle}>피드백</Text>
        {session.feedbackSummary ? (
          <View style={styles.feedbackRow}>
            <FeedbackPill label="음악" value={session.feedbackSummary.musicFit} />
            <FeedbackPill label="집중" value={session.feedbackSummary.focusResult} />
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

const orbSize = space['5xl'];

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
    backgroundColor: color.bg.base,
  },
  content: {
    gap: space.lg,
    paddingHorizontal: space.xl,
  },
  empty: {
    backgroundColor: color.bg.base,
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
  hero: {
    borderColor: color.border.subtle,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: space.sm,
    overflow: 'hidden',
    padding: space.xl,
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
  planetOrb: {
    borderColor: color.border.default,
    borderRadius: orbSize / 2,
    borderWidth: StyleSheet.hairlineWidth,
    height: orbSize,
    width: orbSize,
  },
  title: {
    color: color.text.primary,
    fontFamily: type.h1.family,
    fontSize: type.h1.size,
    fontWeight: type.h1.weight,
    lineHeight: type.h1.lineHeight,
  },
});
