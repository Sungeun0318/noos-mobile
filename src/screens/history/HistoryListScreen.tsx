import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { PlanetImage } from '@/components/PlanetImage';
import { Button, Card } from '@/components/ui';
import { ScreenBackdrop } from '@/components/backdrop/ScreenBackdrop';
import { noosTelemetry } from '@/lib/telemetry';
import type { HistoryStackParamList } from '@/navigation/HistoryStack';
import { listHistory } from '@/screens/history/historyGateway';
import { labelForAdaptiveModeKey } from '@/screens/journey/adaptiveSessionMode';
import {
  listHistorySessions,
  useHistoryStore,
  type HistorySession,
} from '@/stores/historyStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { color, PLANETS, space, type } from '@/theme';

type HistoryListProps = NativeStackScreenProps<HistoryStackParamList, 'History/List'>;
interface HistoryDateGroup {
  key: string;
  label: string;
  sessions: HistorySession[];
}

const emptyHistorySessions: HistorySession[] = [];

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
  const sessions = simulationMode ? localSessions : historyQuery.data ?? emptyHistorySessions;
  const groupedSessions = useMemo(() => groupHistorySessions(sessions), [sessions]);

  useEffect(() => {
    noosTelemetry.track('history_view', { count: sessions.length });
  }, [sessions.length]);

  function goPlanetSelect() {
    navigation.getParent()?.navigate('Journey');
  }

  if (!simulationMode && historyQuery.isLoading) {
    return (
      <ScreenBackdrop>
        <View style={[styles.empty, { paddingTop: insets.top + space['3xl'] }]}>
          <EmptyState
            body="서버에서 완료한 세션을 확인하고 있습니다."
            planet="saturn"
            title="기록을 불러오는 중"
          />
        </View>
      </ScreenBackdrop>
    );
  }

  if (sessions.length === 0) {
    return (
      <ScreenBackdrop planet="neptune">
        <View style={[styles.empty, { paddingTop: insets.top + space['3xl'] }]}>
          <EmptyState
            action={<Button label="첫 세션 시작" onPress={goPlanetSelect} />}
            body="첫 세션을 만들고 나면 완료 기록이 여기에 쌓입니다."
            title="아직 세션이 없어요"
          />
        </View>
      </ScreenBackdrop>
    );
  }

  return (
    <ScreenBackdrop planet={sessions[0]?.planet}>
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
          <Text style={styles.metaText}>서버 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</Text>
        ) : null}
        {groupedSessions.map((group) => (
          <View key={group.key} style={styles.dateSection}>
            <View style={styles.dateHeader}>
              <Text style={styles.sectionTitle}>{group.label}</Text>
              <Text style={styles.metaText}>{group.sessions.length}개 세션</Text>
            </View>
            {group.sessions.map((session) => (
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
          </View>
        ))}
      </ScrollView>
    </ScreenBackdrop>
  );
}

function HistoryCard({ session, onPress }: { session: HistorySession; onPress: () => void }) {
  const planet = PLANETS[session.planet];
  const adaptive = session.kind === 'adaptive';
  const adaptiveModeLabel = labelForAdaptiveModeKey(session.adaptiveMode);

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Card level={1} padding="lg" planetTint={session.planet} variant="glass">
        <View style={styles.cardRow}>
          <PlanetImage planet={session.planet} round size={orbSize} style={styles.planetImage} />
          <View style={styles.cardCopy}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>{session.summary?.title ?? planet.trackName}</Text>
              <View style={styles.pillRow}>
                {adaptive ? <Text style={styles.kindPill}>적응형</Text> : null}
                {adaptiveModeLabel ? <Text style={styles.modePill}>{adaptiveModeLabel}</Text> : null}
                <Text style={styles.durationPill}>{formatDuration(session.durationSec)}</Text>
              </View>
            </View>
            <Text style={styles.bodyText}>{formatTime(session.completedAt)} · {planet.title}</Text>
            <Text style={styles.metaText}>{session.stateLabel ?? '상태 기록 없음'}</Text>
            <Text style={styles.feedbackText}>{formatFeedback(session)}</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

function groupHistorySessions(sessions: HistorySession[]): HistoryDateGroup[] {
  return sessions.reduce<HistoryDateGroup[]>((groups, session) => {
    const key = new Date(session.completedAt).toDateString();
    const existing = groups.find((group) => group.key === key);

    if (existing) {
      existing.sessions.push(session);
      return groups;
    }

    groups.push({
      key,
      label: formatDate(session.completedAt),
      sessions: [session],
    });

    return groups;
  }, []);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ko-KR', {
    day: 'numeric',
    month: 'long',
    weekday: 'short',
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(durationSec: number) {
  return `${Math.round(durationSec / 60)}분`;
}

function formatFeedback(session: HistorySession) {
  if (!session.feedbackSummary) {
    return '피드백 없음';
  }

  const base = `음악 ${Math.round(session.feedbackSummary.musicFit * 100)}% · 집중 ${Math.round(
    session.feedbackSummary.focusResult * 100,
  )}%`;

  if (typeof session.feedbackSummary.transitionNatural === 'number') {
    return `${base} · 전환 ${Math.round(session.feedbackSummary.transitionNatural * 100)}%`;
  }

  return base;
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
    flexShrink: 1,
    gap: space.xs,
    minWidth: 0,
  },
  cardRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
  },
  cardTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: color.text.primary,
    flexShrink: 1,
    fontFamily: type.bodyMd.family,
    fontSize: type.bodyMd.size,
    fontWeight: type.bodyMd.weight,
    lineHeight: type.bodyMd.lineHeight,
  },
  container: {
    backgroundColor: 'transparent',
  },
  content: {
    gap: space.lg,
    paddingHorizontal: space.xl,
  },
  dateHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateSection: {
    gap: space.sm,
  },
  durationPill: {
    color: color.brand.accent,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    lineHeight: type.caption.lineHeight,
  },
  kindPill: {
    color: color.text.primary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    lineHeight: type.caption.lineHeight,
  },
  modePill: {
    color: color.text.secondary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    lineHeight: type.caption.lineHeight,
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
  feedbackText: {
    color: color.text.secondary,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
  },
  planetImage: {
    borderColor: color.border.default,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  pressed: {
    opacity: 0.85,
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
