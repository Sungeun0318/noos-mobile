import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlanetImage } from '@/components/PlanetImage';
import { Button, Card } from '@/components/ui';
import { noosTelemetry } from '@/lib/telemetry';
import type { HistoryStackParamList } from '@/navigation/HistoryStack';
import { listHistory } from '@/screens/history/historyGateway';
import {
  listHistorySessions,
  useHistoryStore,
  type HistorySession,
} from '@/stores/historyStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { color, PLANETS, space, type } from '@/theme';

type HistoryListProps = NativeStackScreenProps<HistoryStackParamList, 'History/List'>;

export function HistoryListScreen({ navigation }: HistoryListProps) {
  const insets = useSafeAreaInsets();
  const simulationMode = useSettingsStore((state) => state.simulationMode);
  const historySessions = useHistoryStore((state) => state.sessions);
  const localSessions = useMemo(() => listHistorySessions(historySessions), [historySessions]);
  const mode = simulationMode ? 'mock' : 'real';
  const historyQuery = useQuery({
    queryFn: () => listHistory(mode),
    queryKey: ['history', mode],
    staleTime: 30_000,
  });
  const sessions = simulationMode ? localSessions : historyQuery.data ?? [];

  useEffect(() => {
    noosTelemetry.track('history_view', { count: sessions.length });
  }, [sessions.length]);

  function goPlanetSelect() {
    navigation.getParent()?.navigate('Journey');
  }

  if (!simulationMode && historyQuery.isLoading) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top + space['3xl'] }]}>
        <Text style={styles.title}>기록을 불러오는 중</Text>
        <Text style={styles.bodyText}>서버에서 완료한 세션을 확인하고 있어.</Text>
      </View>
    );
  }

  if (sessions.length === 0) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top + space['3xl'] }]}>
        <Text style={styles.title}>아직 세션이 없어요</Text>
        <Text style={styles.bodyText}>첫 세션을 만들고 나면 완료 기록이 여기에 쌓여.</Text>
        <Button label="첫 세션 시작" onPress={goPlanetSelect} />
      </View>
    );
  }

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
      <View style={styles.header}>
        <Text style={styles.eyebrow}>History</Text>
        <Text style={styles.title}>완료한 세션</Text>
      </View>
      {!simulationMode && historyQuery.isError ? (
        <Text style={styles.metaText}>서버 기록을 불러오지 못했어. 잠시 후 다시 시도해줘.</Text>
      ) : null}
      {sessions.map((session) => (
        <HistoryCard
          key={session.sessionId}
          session={session}
          onPress={() => {
            noosTelemetry.track('history_card_tap', {
              planet: session.planet,
              sessionId: session.sessionId,
            });
            navigation.navigate('History/Detail', { sessionId: session.sessionId });
          }}
        />
      ))}
    </ScrollView>
  );
}

function HistoryCard({ session, onPress }: { session: HistorySession; onPress: () => void }) {
  const planet = PLANETS[session.planet];

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Card level={1} padding="lg" planetTint={session.planet}>
        <View style={styles.cardRow}>
          <PlanetImage planet={session.planet} round size={orbSize} style={styles.planetImage} />
          <View style={styles.cardCopy}>
            <Text style={styles.cardTitle}>{session.summary?.title ?? planet.trackName}</Text>
            <Text style={styles.bodyText}>
              {formatDate(session.completedAt)} · {formatDuration(session.durationSec)}
            </Text>
            <Text style={styles.metaText}>
              {session.stateLabel ?? '상태 기록 없음'} · {formatFeedback(session)}
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ko-KR', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  });
}

function formatDuration(durationSec: number) {
  return `${Math.round(durationSec / 60)}분`;
}

function formatFeedback(session: HistorySession) {
  if (!session.feedbackSummary) {
    return '피드백 없음';
  }

  return `음악 ${Math.round(session.feedbackSummary.musicFit * 100)}% · 집중 ${Math.round(
    session.feedbackSummary.focusResult * 100,
  )}%`;
}

const orbSize = space['4xl'];

const styles = StyleSheet.create({
  bodyText: {
    color: color.text.secondary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
  },
  cardCopy: {
    flex: 1,
    gap: space.xs,
  },
  cardRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
  },
  cardTitle: {
    color: color.text.primary,
    fontFamily: type.bodyMd.family,
    fontSize: type.bodyMd.size,
    fontWeight: type.bodyMd.weight,
    lineHeight: type.bodyMd.lineHeight,
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
  header: {
    gap: space.xs,
  },
  metaText: {
    color: color.text.tertiary,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
  },
  planetImage: {
    borderColor: color.border.default,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pressed: {
    opacity: 0.85,
  },
  title: {
    color: color.text.primary,
    fontFamily: type.h1.family,
    fontSize: type.h1.size,
    fontWeight: type.h1.weight,
    lineHeight: type.h1.lineHeight,
  },
});
