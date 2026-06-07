import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getAdaptiveSession } from '@/api/adaptiveGateway';
import { resolveAudioSource } from '@/audio/resolveAudioSource';
import { createAdaptiveCaptureLoop, type AdaptiveCaptureLoop } from '@/adaptive/adaptiveCaptureEngine';
import { ScreenBackdrop } from '@/components/backdrop/ScreenBackdrop';
import { PlanetImage } from '@/components/PlanetImage';
import { Button, Toast } from '@/components/ui';
import { noosTelemetry } from '@/lib/telemetry';
import type { JourneyStackParamList } from '@/navigation/JourneyStack';
import { buildAdaptivePlayerViewModel } from '@/screens/journey/adaptivePlayerState';
import { useAdaptiveSessionStore } from '@/stores/adaptiveSessionStore';
import { color, PLANET_COLORS, radius, space, type, type PlanetId } from '@/theme';

type AdaptivePlayerProps = NativeStackScreenProps<JourneyStackParamList, 'Journey/AdaptivePlayer'>;
type PlayState = 'loading' | 'playing' | 'paused' | 'error';

const pollMs = 5_000;
const orbSize = space['6xl'] * 2;

export function AdaptivePlayerScreen({ navigation, route }: AdaptivePlayerProps) {
  const insets = useSafeAreaInsets();
  const session = useAdaptiveSessionStore((state) => state.session);
  const segments = useAdaptiveSessionStore((state) => state.segments);
  const lastAction = useAdaptiveSessionStore((state) => state.lastAction);
  const lastSignalScore = useAdaptiveSessionStore((state) => state.lastSignalScore);
  const nextGenStatus = useAdaptiveSessionStore((state) => state.nextGenStatus);
  const wearStatus = useAdaptiveSessionStore((state) => state.wearStatus);
  const applyGetResponse = useAdaptiveSessionStore((state) => state.applyGetResponse);
  const viewModel = useMemo(
    () =>
      buildAdaptivePlayerViewModel({
        lastAction,
        lastSignalScore,
        nextGenStatus,
        segments,
        session,
        wearStatus,
      }),
    [lastAction, lastSignalScore, nextGenStatus, segments, session, wearStatus],
  );
  const audioSource = useMemo(
    () =>
      resolveAudioSource(
        viewModel.canPlayCurrent
          ? {
              audio: {
                audioId: viewModel.audioId ?? '',
                durationSec: viewModel.durationSec,
              },
            }
          : null,
      ),
    [viewModel.audioId, viewModel.canPlayCurrent, viewModel.durationSec],
  );
  const player = useAudioPlayer(audioSource, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const captureLoopRef = useRef<AdaptiveCaptureLoop | null>(null);
  const startedAudioIdRef = useRef<string | null>(null);
  const [playState, setPlayState] = useState<PlayState>('paused');
  const [error, setError] = useState<string | null>(null);
  const durationSec = status.duration || viewModel.durationSec;
  const positionSec = status.currentTime || 0;
  const progress = durationSec > 0 ? Math.min(positionSec / durationSec, 1) : 0;

  useEffect(() => {
    void setAudioModeAsync({
      interruptionMode: 'duckOthers',
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let interval: ReturnType<typeof setInterval> | null = null;

      async function refresh() {
        try {
          const response = await getAdaptiveSession(route.params.sessionId);

          if (!cancelled) {
            applyGetResponse(response);
          }
        } catch {
          if (!cancelled) {
            setError('세션 상태를 불러오지 못했어요. 네트워크를 확인해 주세요.');
          }
        }
      }

      void refresh().then(() => {
        if (cancelled) {
          return;
        }

        captureLoopRef.current = createAdaptiveCaptureLoop({
          sessionId: route.params.sessionId,
        });
        void captureLoopRef.current.start().catch(() => {
          if (!cancelled) {
            setError('EEG 캡처를 이어가지 못했어요.');
          }
        });
      });
      interval = setInterval(() => {
        void refresh();
      }, pollMs);
      noosTelemetry.track('adaptive_player_view', { sessionId: route.params.sessionId });

      return () => {
        cancelled = true;
        captureLoopRef.current?.stop();
        captureLoopRef.current = null;

        if (interval) {
          clearInterval(interval);
        }
      };
    }, [applyGetResponse, route.params.sessionId]),
  );

  useEffect(() => {
    if (!viewModel.canPlayCurrent) {
      setPlayState('paused');
      startedAudioIdRef.current = null;
      return;
    }

    if (status.error) {
      setPlayState('error');
      setError('세그먼트 재생에 실패했어요.');
      noosTelemetry.track('adaptive_player_error', {
        audioId: viewModel.audioId,
        sessionId: route.params.sessionId,
      });
      return;
    }

    if (status.isLoaded && startedAudioIdRef.current !== viewModel.audioId) {
      startedAudioIdRef.current = viewModel.audioId;
      setPlayState('paused');
    }
  }, [route.params.sessionId, status.error, status.isLoaded, viewModel.audioId, viewModel.canPlayCurrent]);

  function togglePlayback() {
    if (!viewModel.canPlayCurrent || !status.isLoaded || playState === 'error') {
      return;
    }

    if (status.playing) {
      player.pause();
      setPlayState('paused');
      noosTelemetry.track('adaptive_player_pause', {
        positionSec: Math.round(positionSec),
        sessionId: route.params.sessionId,
      });
      return;
    }

    player.play();
    setPlayState('playing');
    noosTelemetry.track('adaptive_player_play', {
      audioId: viewModel.audioId,
      sessionId: route.params.sessionId,
    });
  }

  function goJourney() {
    navigation.navigate('Journey/PlanetSelect');
  }

  if (session && session.sessionId !== route.params.sessionId) {
    return (
      <ScreenBackdrop style={[styles.empty, { paddingTop: insets.top + space['3xl'] }]}>
        <Text style={styles.title}>세션을 찾을 수 없어요</Text>
        <Text style={styles.body}>진행 중인 적응형 세션에서 다시 열어 주세요.</Text>
        <Button label="행성 선택으로 이동" onPress={goJourney} />
      </ScreenBackdrop>
    );
  }

  return (
    <ScreenBackdrop planet={viewModel.planet}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + space['5xl'],
            paddingTop: insets.top + space.xl,
          },
        ]}
      >
        {error ? <Toast message={error} variant="danger" /> : null}

        <View style={styles.pillRow}>
          <StatusPill label={viewModel.wearLabel} tone={wearStatus === 'worn' ? 'good' : 'neutral'} />
          <StatusPill label={viewModel.signalLabel} tone={lastSignalScore !== null && lastSignalScore >= 0.35 ? 'good' : 'neutral'} />
          <LightingPill />
        </View>

        <View style={styles.hero}>
          <View style={styles.planetAura} />
          <PlanetImage planet={viewModel.planet} round size={orbSize} style={styles.planetImage} />
        </View>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>{viewModel.planetTitle}</Text>
          <Text style={styles.title}>{viewModel.trackTitle}</Text>
          <Text style={styles.body}>{viewModel.subtitle}</Text>
        </View>

        <View style={styles.segmentPanel}>
          <View style={styles.segmentHeader}>
            <View>
              <Text style={styles.label}>현재 세그먼트</Text>
              <Text style={styles.segmentTitle}>{viewModel.currentSegmentLabel}</Text>
            </View>
            <StatusPill label={viewModel.nextGenLabel} tone={viewModel.nextGenTone} />
          </View>
          {viewModel.actionLabel ? <Text style={styles.body}>{viewModel.actionLabel}</Text> : null}
          <ProgressBar progress={progress} planet={viewModel.planet} />
          <View style={styles.timeRow}>
            <Text style={styles.time}>{formatTime(positionSec)}</Text>
            <Text style={styles.time}>{formatTime(durationSec)}</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <Pressable
            accessibilityLabel={status.playing ? '일시정지' : '재생'}
            accessibilityRole="button"
            disabled={!viewModel.canPlayCurrent || playState === 'error'}
            onPress={togglePlayback}
            style={[
              styles.playButton,
              (!viewModel.canPlayCurrent || playState === 'error') && styles.playButtonDisabled,
            ]}
          >
            {!viewModel.canPlayCurrent ? (
              <ActivityIndicator color={color.text.inverse} />
            ) : (
              <Text style={styles.playButtonText}>{status.playing ? 'Ⅱ' : '▶'}</Text>
            )}
          </Pressable>
          <Text style={styles.body}>
            {viewModel.canPlayCurrent ? '현재 준비된 세그먼트를 재생할 수 있어요.' : '첫 세그먼트가 준비되면 재생할 수 있어요.'}
          </Text>
        </View>

        <View style={styles.deferredPanel}>
          <Text style={styles.label}>실시간 EEG 그래프</Text>
          <Text style={styles.body}>FE-A4에서 밴드 트렌드와 파형을 이 영역에 연결합니다.</Text>
        </View>
      </ScrollView>
    </ScreenBackdrop>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: 'neutral' | 'good' | 'working' | 'ready' | 'failed' | 'idle';
}) {
  return (
    <View style={[styles.statusPill, styles[`statusPill_${tone}`]]}>
      <Text style={styles.statusPillText}>{label}</Text>
    </View>
  );
}

function LightingPill() {
  return (
    <View style={styles.statusPill}>
      <Text style={styles.statusPillText}>조명 OFF</Text>
    </View>
  );
}

function ProgressBar({ planet, progress }: { planet: PlanetId; progress: number }) {
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          {
            backgroundColor: PLANET_COLORS[planet].secondary,
            width: `${Math.round(progress * 100)}%`,
          },
        ]}
      />
    </View>
  );
}

function formatTime(valueSec: number) {
  const totalSec = Math.max(0, Math.floor(valueSec));
  const minutes = Math.floor(totalSec / 60);
  const seconds = String(totalSec % 60).padStart(2, '0');

  return `${minutes}:${seconds}`;
}

const styles = StyleSheet.create({
  body: {
    color: color.text.secondary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
  },
  content: {
    gap: space.xl,
    paddingHorizontal: space.xl,
  },
  controls: {
    alignItems: 'center',
    gap: space.md,
  },
  deferredPanel: {
    backgroundColor: color.bg.glass,
    borderColor: color.border.default,
    borderRadius: radius['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
    gap: space.sm,
    padding: space.lg,
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
    letterSpacing: 0.4,
    lineHeight: type.caption.lineHeight,
  },
  header: {
    gap: space.sm,
  },
  hero: {
    alignItems: 'center',
    height: orbSize + space['5xl'],
    justifyContent: 'center',
  },
  label: {
    color: color.text.tertiary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    letterSpacing: 0.4,
    lineHeight: type.caption.lineHeight,
  },
  pillRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  planetAura: {
    backgroundColor: color.bg.overlay,
    borderRadius: radius.pill,
    height: orbSize + space['4xl'],
    opacity: 0.24,
    position: 'absolute',
    width: orbSize + space['4xl'],
  },
  planetImage: {
    borderColor: color.border.default,
    borderWidth: StyleSheet.hairlineWidth,
  },
  playButton: {
    alignItems: 'center',
    backgroundColor: color.brand.accent,
    borderColor: color.border.strong,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: space['6xl'] + space.xl,
    justifyContent: 'center',
    width: space['6xl'] + space.xl,
  },
  playButtonDisabled: {
    opacity: 0.55,
  },
  playButtonText: {
    color: color.text.inverse,
    fontFamily: type.h2.family,
    fontSize: type.h2.size,
    fontWeight: type.h2.weight,
    lineHeight: type.h2.lineHeight,
  },
  progressFill: {
    borderRadius: radius.pill,
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  progressTrack: {
    backgroundColor: color.bg.surfaceAlt,
    borderRadius: radius.pill,
    height: space.md,
    overflow: 'hidden',
  },
  segmentHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    justifyContent: 'space-between',
  },
  segmentPanel: {
    backgroundColor: color.bg.glass,
    borderColor: color.border.default,
    borderRadius: radius['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
    gap: space.lg,
    padding: space.lg,
  },
  segmentTitle: {
    color: color.text.primary,
    fontFamily: type.h3.family,
    fontSize: type.h3.size,
    fontWeight: type.h3.weight,
    lineHeight: type.h3.lineHeight,
  },
  statusPill: {
    backgroundColor: color.bg.surfaceAlt,
    borderColor: color.border.default,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  statusPillText: {
    color: color.text.secondary,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
  },
  statusPill_failed: {
    borderColor: color.state.danger,
  },
  statusPill_good: {
    borderColor: color.state.success,
  },
  statusPill_idle: {
    opacity: 0.72,
  },
  statusPill_neutral: {},
  statusPill_ready: {
    borderColor: color.state.success,
  },
  statusPill_working: {
    borderColor: color.brand.accent,
  },
  time: {
    color: color.text.tertiary,
    fontFamily: type.tabular.family,
    fontSize: type.tabular.size,
    fontWeight: type.tabular.weight,
    lineHeight: type.tabular.lineHeight,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: color.text.primary,
    fontFamily: type.h1.family,
    fontSize: type.h1.size,
    fontWeight: type.h1.weight,
    lineHeight: type.h1.lineHeight,
  },
});
