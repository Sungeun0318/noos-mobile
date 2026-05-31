import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { PlanetHero } from '@/components/PlanetHero';
import { ScreenBackdrop } from '@/components/backdrop/ScreenBackdrop';
import { Button, Card } from '@/components/ui';
import { noosTelemetry } from '@/lib/telemetry';
import type { JourneyStackParamList } from '@/navigation/JourneyStack';
import { usePollSession } from '@/queries/usePollSession';
import { useSessionStore, type PendingSession } from '@/stores/sessionStore';
import { color, PLANET_COLORS, PLANETS, radius, space, type } from '@/theme';

import { getSessionPendingViewState } from './sessionPendingState';

type SessionPendingProps = NativeStackScreenProps<JourneyStackParamList, 'Journey/PendingSession'>;

export function SessionPendingScreen({ navigation, route }: SessionPendingProps) {
  const insets = useSafeAreaInsets();
  const pending = useSessionStore((state) => state.pending);
  const session = useMemo(
    () => pending.find((item) => item.sessionId === route.params.sessionId) ?? null,
    [pending, route.params.sessionId],
  );

  function goToday() {
    noosTelemetry.track('session_pending_leave_tap');
    navigation.getParent()?.navigate('Today');
  }

  if (!session) {
    return (
      <ScreenBackdrop>
        <View style={[styles.empty, { paddingTop: insets.top + space['3xl'] }]}>
          <EmptyState
            action={<Button label="Today에서 계속 보기" onPress={goToday} />}
            body="이 세션은 이미 재생 중이거나 목록에서 정리됐을 수 있어요."
            planet="neptune"
            title="세션을 찾을 수 없어요"
          />
        </View>
      </ScreenBackdrop>
    );
  }

  return <SessionPendingContent navigation={navigation} session={session} />;
}

function SessionPendingContent({
  navigation,
  session,
}: {
  navigation: SessionPendingProps['navigation'];
  session: PendingSession;
}) {
  const insets = useSafeAreaInsets();
  const promoteToActive = useSessionStore((state) => state.promoteToActive);
  const pollQuery = usePollSession(session);
  const viewState = getSessionPendingViewState(session);
  const planet = PLANETS[session.planet];

  useEffect(() => {
    noosTelemetry.track('session_pending_view', {
      planet: session.planet,
      sessionId: session.sessionId,
    });
  }, [session.planet, session.sessionId]);

  function goToday() {
    noosTelemetry.track('session_pending_leave_tap');
    navigation.getParent()?.navigate('Today');
  }

  function playReady() {
    promoteToActive(session.sessionId);
    noosTelemetry.track('session_pending_play_tap', {
      planet: session.planet,
      sessionId: session.sessionId,
    });
    navigation.navigate('Journey/Player', { sessionId: session.sessionId });
  }

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
        <PlanetHero planet={session.planet}>
          <Text style={styles.eyebrow}>Generating</Text>
          <Text style={styles.title}>{planet.title}</Text>
          <Text style={styles.bodyText}>{planet.description}</Text>
        </PlanetHero>

        <Card level={2} padding="xl" planetTint={session.planet} variant="glass">
          <View style={styles.statusStack}>
            <View style={styles.statusHeader}>
              <Text style={styles.statusTitle}>{viewState.title}</Text>
              {viewState.etaLabel ? <Text style={styles.etaText}>{viewState.etaLabel}</Text> : null}
            </View>
            <Text style={styles.bodyText}>{viewState.body}</Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor:
                      session.status === 'failed'
                        ? color.state.danger
                        : PLANET_COLORS[session.planet].secondary,
                    width: `${Math.round(Math.max(0, Math.min(viewState.progress, 1)) * 100)}%`,
                  },
                ]}
              />
            </View>
            {pollQuery.isError ? <Text style={styles.metaText}>연결 확인 필요 · 다음 폴링에서 다시 확인해요.</Text> : null}
            {viewState.showLongRunningHint ? (
              <Text style={styles.metaText}>최대 1시간 걸릴 수 있어요 · Today에서 계속 보기</Text>
            ) : null}
          </View>
        </Card>

        <View style={styles.actions}>
          {viewState.showPlay ? (
            <Button fullWidth label="재생하기" onPress={playReady} size="lg" />
          ) : null}
          <Button
            fullWidth
            label="Today에서 계속 보기"
            onPress={goToday}
            size="lg"
            variant={viewState.showPlay ? 'secondary' : 'primary'}
          />
          {session.status === 'failed' ? (
            <Button
              fullWidth
              label="행성 선택으로 돌아가기"
              onPress={() => navigation.navigate('Journey/PlanetSelect')}
              variant="secondary"
            />
          ) : null}
        </View>
      </ScrollView>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: space.sm,
  },
  bodyText: {
    color: color.text.secondary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
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
    justifyContent: 'center',
    padding: space.xl,
  },
  etaText: {
    color: color.text.tertiary,
    fontFamily: type.tabular.family,
    fontSize: type.tabular.size,
    fontWeight: type.tabular.weight,
    lineHeight: type.tabular.lineHeight,
  },
  eyebrow: {
    color: color.text.tertiary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    letterSpacing: 0.4,
    lineHeight: type.caption.lineHeight,
  },
  metaText: {
    color: color.text.tertiary,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
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
  statusHeader: {
    gap: space.xs,
  },
  statusStack: {
    gap: space.md,
  },
  statusTitle: {
    color: color.text.primary,
    fontFamily: type.h2.family,
    fontSize: type.h2.size,
    fontWeight: type.h2.weight,
    lineHeight: type.h2.lineHeight,
  },
  title: {
    color: color.text.primary,
    fontFamily: type.h1.family,
    fontSize: type.h1.size,
    fontWeight: type.h1.weight,
    lineHeight: type.h1.lineHeight,
  },
});
