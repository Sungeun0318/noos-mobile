import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card } from '@/components/ui';
import { GuestPromptCard } from '@/components/GuestPromptCard';
import { noosTelemetry } from '@/lib/telemetry';
import { useHealth } from '@/queries/useHealth';
import { usePollSession } from '@/queries/usePollSession';
import { useAuthStore } from '@/stores/authStore';
import {
  latestHistorySession,
  useHistoryStore,
  type HistorySession,
} from '@/stores/historyStore';
import { useSessionStore, type PendingSession } from '@/stores/sessionStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useStateStore } from '@/stores/stateStore';
import { color, PLANET_COLORS, PLANETS, radius, space, type } from '@/theme';

type TabNavigation = {
  navigate: (
    screen: 'Measure' | 'Journey' | 'History' | 'Settings',
    params?: {
      screen: 'Journey/Player' | 'History/Detail';
      params: { sessionId: string };
    },
  ) => void;
};

export function TodayScreen() {
  const navigation = useNavigation<TabNavigation>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const mode = useAuthStore((state) => state.mode);
  const backendBaseUrl = useSettingsStore((state) => state.backendBaseUrl);
  const stateLabel = useStateStore((state) => state.stateLabel);
  const measuredAt = useStateStore((state) => state.measuredAt);
  const source = useStateStore((state) => state.source);
  const recommendedPlanet = useStateStore((state) => state.recommendedPlanet);
  const pendingSessions = useSessionStore((state) => state.pending);
  const recentSession = useHistoryStore((state) => latestHistorySession(state.sessions));

  useEffect(() => {
    noosTelemetry.track('today_view');
  }, []);

  function goMeasure() {
    noosTelemetry.track('today_measure_tap');
    navigation.navigate('Measure');
  }

  function goStartSession() {
    noosTelemetry.track('today_start_session_tap', { from: 'cta' });
    navigation.navigate('Journey');
  }

  if (!backendBaseUrl) {
    return (
      <View style={[styles.gate, { paddingTop: insets.top + space['3xl'] }]}>
        <Text style={styles.gateTitle}>백엔드 연결 설정</Text>
        <Text style={styles.gateCopy}>NOOS 모바일 API 주소를 먼저 연결해야 Today를 볼 수 있어요.</Text>
        <Button label="설정으로 이동" onPress={() => navigation.navigate('Settings')} />
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
      <Header displayName={mode === 'authed' ? user?.displayName : null} />
      <GuestPromptCard />
      <StateCard measuredAt={measuredAt} onMeasure={goMeasure} source={source} stateLabel={stateLabel} />
      <RecommendedPlanetCard planet={recommendedPlanet} />
      <PendingSessionsBlock sessions={pendingSessions} />
      <Button fullWidth label="지금 세션 시작" onPress={goStartSession} size="lg" />
      <RecentSessionMini session={recentSession} />
    </ScrollView>
  );
}

function Header({ displayName }: { displayName: string | null | undefined }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.eyebrow}>Today</Text>
        <Text style={styles.title}>안녕하세요, {displayName || 'Explorer'}</Text>
      </View>
      <HealthDot />
    </View>
  );
}

function HealthDot() {
  const { data, isError } = useHealth();
  const healthy = data?.backend === 'ok' && data.aceStep === 'ok';

  return (
    <View
      accessibilityLabel="backend health"
      style={[
        styles.healthDot,
        {
          backgroundColor: isError ? color.state.danger : healthy ? color.state.success : color.state.warning,
        },
      ]}
    />
  );
}

function formatMeasuredAt(measuredAt: string | null) {
  if (!measuredAt) {
    return null;
  }

  return new Date(measuredAt).toLocaleString('ko-KR', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
}

function sourceLabel(source: string | null) {
  if (source === 'eeg') {
    return 'EEG';
  }

  if (source === 'hybrid') {
    return '설문+EEG';
  }

  return '설문 측정';
}

function StateCard({
  stateLabel,
  measuredAt,
  source,
  onMeasure,
}: {
  stateLabel: string | null;
  measuredAt: string | null;
  source: string | null;
  onMeasure: () => void;
}) {
  if (!stateLabel) {
    return (
      <Card level={2} padding="xl">
        <View style={styles.cardStack}>
          <Text style={styles.cardTitle}>아직 측정 기록이 없어요</Text>
          <Text style={styles.bodyText}>지금 상태를 입력하면 더 정확한 행성 추천을 받을 수 있어요.</Text>
          <Button label="내 상태 측정하기" onPress={onMeasure} variant="secondary" />
        </View>
      </Card>
    );
  }

  return (
    <Card level={2} padding="xl">
      <View style={styles.cardStack}>
        <Text style={styles.label}>마지막 측정</Text>
        <Text style={styles.stateLabel}>{stateLabel}</Text>
        <Text style={styles.bodyText}>
          {formatMeasuredAt(measuredAt) ?? '방금'} · {sourceLabel(source)}
        </Text>
      </View>
    </Card>
  );
}

function RecommendedPlanetCard({ planet: measuredPlanet }: { planet: keyof typeof PLANETS | null }) {
  const planetId = measuredPlanet ?? 'neptune';
  const planet = PLANETS[planetId];
  const colors = PLANET_COLORS[planetId];
  const subtitle = measuredPlanet ? planet.description : '측정 후 더 정확해져요';

  return (
    <Card level={1} padding="xl" planetTint={planet.id}>
      <View style={styles.recommendRow}>
        <View style={styles.cardStack}>
          <Text style={styles.label}>추천 행성</Text>
          <Text style={styles.cardTitle}>{planet.title}</Text>
          <Text style={styles.bodyText}>{subtitle}</Text>
        </View>
        <View style={[styles.planetOrb, { backgroundColor: colors.secondary }]} />
      </View>
    </Card>
  );
}

function PendingSessionsBlock({ sessions }: { sessions: PendingSession[] }) {
  if (sessions.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>생성 중인 세션</Text>
      {[...sessions].sort((a, b) => b.enqueuedAt - a.enqueuedAt).map((session) => (
        <PendingSessionCard key={session.sessionId} session={session} />
      ))}
    </View>
  );
}

function PendingSessionCard({ session }: { session: PendingSession }) {
  const navigation = useNavigation<TabNavigation>();
  const promoteToActive = useSessionStore((state) => state.promoteToActive);
  const removePending = useSessionStore((state) => state.removePending);
  const progress = session.progress?.percent ?? pendingStatusProgress(session.status);
  const etaSec = session.progress?.etaSec ?? session.estimatedReadyInSec;
  const query = usePollSession(session);

  useEffect(() => {
    noosTelemetry.track('pending_card_view', { status: session.status });
  }, [session.status]);

  function playReady() {
    promoteToActive(session.sessionId);
    noosTelemetry.track('pending_card_tap_play', {
      ms_since_enqueue: Date.now() - session.enqueuedAt,
      sessionId: session.sessionId,
    });
    navigation.navigate('Journey', {
      params: { sessionId: session.sessionId },
      screen: 'Journey/Player',
    });
  }

  function retryLater() {
    removePending(session.sessionId);
    // TODO FE-XX: re-enqueue from PlanetSelect/draft if inline retry becomes required.
  }

  return (
    <Card level={2} padding="lg" planetTint={session.planet}>
      <View style={styles.pendingContent}>
        <View style={styles.pendingHeader}>
          <Text style={styles.pendingTitle}>
            {PLANETS[session.planet].title} · {formatDuration(session.durationSec)} ·{' '}
            {pendingStatusLabel(session.status)}
          </Text>
          <Text style={styles.pendingEta}>
            {query.isError ? '연결 확인 필요 · ' : ''}
            {formatEta(etaSec, session.status)}
          </Text>
        </View>
        {session.status === 'ready' ? (
          <Pressable
            accessibilityRole="button"
            onPress={playReady}
            style={[
              styles.readyButton,
              { backgroundColor: PLANET_COLORS[session.planet].secondary },
            ]}
          >
            <Text style={styles.readyButtonText}>▶︎ 재생하기</Text>
          </Pressable>
        ) : (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor:
                    session.status === 'failed'
                      ? color.state.danger
                      : PLANET_COLORS[session.planet].secondary,
                  width: `${Math.round(progress * 100)}%`,
                },
              ]}
            />
          </View>
        )}
        {session.error ? <Text style={styles.pendingEta}>{session.error.message}</Text> : null}
        {session.status === 'failed' ? (
          <Button label="다시 시도" onPress={retryLater} size="sm" variant="secondary" />
        ) : null}
      </View>
    </Card>
  );
}

function pendingStatusLabel(status: PendingSession['status']) {
  if (status === 'ready') {
    return '준비 완료';
  }

  if (status === 'generating') {
    return '생성 중';
  }

  if (status === 'failed') {
    return '실패';
  }

  return '대기 중';
}

function pendingStatusProgress(status: PendingSession['status']) {
  if (status === 'ready' || status === 'failed') {
    return 1;
  }

  if (status === 'generating') {
    return 0.35;
  }

  return 0;
}

function formatDuration(durationSec: number) {
  return `${Math.round(durationSec / 60)}분 트랙`;
}

function formatEta(etaSec: number | null | undefined, status?: PendingSession['status']) {
  if (status === 'ready') {
    return '준비 완료';
  }

  if (status === 'failed') {
    return '확인 필요';
  }

  if (!etaSec) {
    return '대기 중';
  }

  return `약 ${Math.ceil(etaSec / 60)}분`;
}

function RecentSessionMini({ session }: { session: HistorySession | null }) {
  const navigation = useNavigation<TabNavigation>();

  if (!session) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        navigation.navigate('History', {
          params: { sessionId: session.sessionId },
          screen: 'History/Detail',
        });
      }}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card level={1} padding="lg" planetTint={session.planet}>
        <View style={styles.recentRow}>
          <View style={styles.cardStack}>
            <Text style={styles.label}>최근 세션</Text>
            <Text style={styles.recentTitle}>
              {session.summary?.title ?? PLANETS[session.planet].trackName}
            </Text>
          </View>
          <Text style={styles.pendingEta}>{formatRecentCompletedAt(session.completedAt)}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

function formatRecentCompletedAt(value: string) {
  return new Date(value).toLocaleDateString('ko-KR', {
    day: 'numeric',
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
  cardStack: {
    flex: 1,
    gap: space.xs,
  },
  cardTitle: {
    color: color.text.primary,
    fontFamily: type.h2.family,
    fontSize: type.h2.size,
    fontWeight: type.h2.weight,
    lineHeight: type.h2.lineHeight,
  },
  container: {
    backgroundColor: color.bg.base,
  },
  content: {
    gap: space.lg,
    paddingHorizontal: space.xl,
  },
  eyebrow: {
    color: color.text.tertiary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    letterSpacing: 0.4,
    lineHeight: type.caption.lineHeight,
  },
  gate: {
    backgroundColor: color.bg.base,
    flex: 1,
    gap: space.lg,
    justifyContent: 'center',
    padding: space.xl,
  },
  gateCopy: {
    color: color.text.secondary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
  },
  gateTitle: {
    color: color.text.primary,
    fontFamily: type.h1.family,
    fontSize: type.h1.size,
    fontWeight: type.h1.weight,
    lineHeight: type.h1.lineHeight,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  healthDot: {
    borderColor: color.border.strong,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: space.md,
    width: space.md,
  },
  label: {
    color: color.text.tertiary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    letterSpacing: 0.4,
    lineHeight: type.caption.lineHeight,
  },
  pendingContent: {
    gap: space.md,
  },
  pendingEta: {
    color: color.text.tertiary,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
  },
  pendingHeader: {
    gap: space.xs,
  },
  pendingTitle: {
    color: color.text.primary,
    fontFamily: type.bodyMd.family,
    fontSize: type.bodyMd.size,
    fontWeight: type.bodyMd.weight,
    lineHeight: type.bodyMd.lineHeight,
  },
  planetOrb: {
    borderRadius: orbSize / 2,
    height: orbSize,
    opacity: 0.88,
    width: orbSize,
  },
  pressed: {
    opacity: 0.85,
  },
  progressFill: {
    borderRadius: radius.pill,
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  progressTrack: {
    backgroundColor: color.bg.elevated,
    borderRadius: radius.pill,
    height: space.xs,
    overflow: 'hidden',
  },
  recentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  recentTitle: {
    color: color.text.primary,
    fontFamily: type.bodyMd.family,
    fontSize: type.bodyMd.size,
    fontWeight: type.bodyMd.weight,
    lineHeight: type.bodyMd.lineHeight,
  },
  recommendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.lg,
  },
  readyButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    justifyContent: 'center',
    paddingVertical: space.md,
  },
  readyButtonText: {
    color: color.text.inverse,
    fontFamily: type.bodyMd.family,
    fontSize: type.bodyMd.size,
    fontWeight: type.bodyMd.weight,
    lineHeight: type.bodyMd.lineHeight,
  },
  section: {
    gap: space.sm,
  },
  sectionTitle: {
    color: color.text.secondary,
    fontFamily: type.h3.family,
    fontSize: type.h3.size,
    fontWeight: type.h3.weight,
    lineHeight: type.h3.lineHeight,
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
});
