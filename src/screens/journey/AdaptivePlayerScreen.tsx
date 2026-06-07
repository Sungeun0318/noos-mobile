import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { getAdaptiveSession, pauseAdaptiveSession, resumeAdaptiveSession } from '@/api/adaptiveGateway';
import { resolveAudioSource } from '@/audio/resolveAudioSource';
import { createAdaptiveCaptureLoop, type AdaptiveCaptureLoop } from '@/adaptive/adaptiveCaptureEngine';
import { applyAdaptiveWearTransition } from '@/adaptive/adaptiveWearEffects';
import {
  createInitialWearDetectorState,
  reduceWearDetector,
  type WearDetectorState,
} from '@/adaptive/wearDetector';
import { ScreenBackdrop } from '@/components/backdrop/ScreenBackdrop';
import { PlanetImage } from '@/components/PlanetImage';
import { Button, Toast } from '@/components/ui';
import { noosTelemetry } from '@/lib/telemetry';
import type { JourneyStackParamList } from '@/navigation/JourneyStack';
import {
  buildAdaptiveGraphData,
  type AdaptiveGraphData,
  type BandKey,
  type BandSeries,
  type TimelinePoint,
} from '@/screens/journey/adaptiveGraphData';
import { buildAdaptivePlayerViewModel } from '@/screens/journey/adaptivePlayerState';
import { useAdaptiveSessionStore } from '@/stores/adaptiveSessionStore';
import { useDeviceStore } from '@/stores/deviceStore';
import { color, motion, PLANET_COLORS, radius, space, type, type PlanetId } from '@/theme';

type AdaptivePlayerProps = NativeStackScreenProps<JourneyStackParamList, 'Journey/AdaptivePlayer'>;
type PlayState = 'loading' | 'playing' | 'paused' | 'error';

const pollMs = 5_000;
const orbSize = space['6xl'] * 2;
const chartWidth = space['6xl'] * 4 + space['3xl'];
const chartHeight = space['6xl'] * 2;
const chartPadding = space.lg;
const wearMonitorMs = 1_000;

const bandColors: Record<BandKey, string> = {
  alpha: PLANET_COLORS.neptune.secondary,
  beta: PLANET_COLORS.mars.secondary,
  delta: color.text.tertiary,
  gamma: color.brand.accent,
  theta: color.state.info,
};

export function AdaptivePlayerScreen({ navigation, route }: AdaptivePlayerProps) {
  const insets = useSafeAreaInsets();
  const session = useAdaptiveSessionStore((state) => state.session);
  const segments = useAdaptiveSessionStore((state) => state.segments);
  const lastAction = useAdaptiveSessionStore((state) => state.lastAction);
  const lastSignalScore = useAdaptiveSessionStore((state) => state.lastSignalScore);
  const nextGenStatus = useAdaptiveSessionStore((state) => state.nextGenStatus);
  const recentWindows = useAdaptiveSessionStore((state) => state.recentWindows);
  const wearStatus = useAdaptiveSessionStore((state) => state.wearStatus);
  const applyGetResponse = useAdaptiveSessionStore((state) => state.applyGetResponse);
  const graphData = useMemo(() => buildAdaptiveGraphData(recentWindows), [recentWindows]);
  const graphOpacity = useSharedValue(1);
  const graphAnimatedStyle = useAnimatedStyle(() => ({
    opacity: graphOpacity.value,
  }));
  const muse = useDeviceStore((state) => state.muse);
  const setWearStatus = useAdaptiveSessionStore((state) => state.setWearStatus);
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
  const screenActiveRef = useRef(false);
  const autoPausedRef = useRef(false);
  const deviceHadConnectionRef = useRef(false);
  const deviceWearStateRef = useRef<WearDetectorState>(createInitialWearDetectorState());
  const startedAudioIdRef = useRef<string | null>(null);
  const [playState, setPlayState] = useState<PlayState>('paused');
  const [error, setError] = useState<string | null>(null);
  const durationSec = status.duration || viewModel.durationSec;
  const positionSec = status.currentTime || 0;
  const progress = durationSec > 0 ? Math.min(positionSec / durationSec, 1) : 0;

  useEffect(() => {
    graphOpacity.value = space.sm / space.md;
    graphOpacity.value = withTiming(1, { duration: motion.duration.slow });
  }, [graphData.timeline.length, graphOpacity]);

  useEffect(() => {
    void setAudioModeAsync({
      interruptionMode: 'duckOthers',
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    });
  }, []);

  const refreshSession = useCallback(async () => {
    const response = await getAdaptiveSession(route.params.sessionId);
    applyGetResponse(response);

    return response;
  }, [applyGetResponse, route.params.sessionId]);

  const startCaptureLoop = useCallback(() => {
    if (!screenActiveRef.current || captureLoopRef.current?.isRunning()) {
      return;
    }

    const loop = createAdaptiveCaptureLoop({
      sessionId: route.params.sessionId,
    });

    captureLoopRef.current = loop;
    void loop.start().catch(() => {
      if (screenActiveRef.current) {
        setError('EEG 캡처를 이어가지 못했어요.');
      }
    });
  }, [route.params.sessionId]);

  const stopCaptureLoop = useCallback(() => {
    captureLoopRef.current?.stop();
    captureLoopRef.current = null;
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let interval: ReturnType<typeof setInterval> | null = null;
      screenActiveRef.current = true;

      async function refresh() {
        try {
          await refreshSession();
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

        startCaptureLoop();
      });
      interval = setInterval(() => {
        void refresh();
      }, pollMs);
      noosTelemetry.track('adaptive_player_view', { sessionId: route.params.sessionId });

      return () => {
        cancelled = true;
        screenActiveRef.current = false;
        stopCaptureLoop();

        if (interval) {
          clearInterval(interval);
        }
      };
    }, [refreshSession, route.params.sessionId, startCaptureLoop, stopCaptureLoop]),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const bleConnected = muse.status === 'connected' || muse.status === 'measuring';

      if (bleConnected) {
        deviceHadConnectionRef.current = true;
      }

      if (!deviceHadConnectionRef.current) {
        return;
      }

      deviceWearStateRef.current = reduceWearDetector(deviceWearStateRef.current, {
        bleConnected,
        now: Date.now(),
        signalScore: bleConnected ? muse.signalQuality : null,
      });

      if (deviceWearStateRef.current.status === 'off' || deviceWearStateRef.current.status === 'worn') {
        setWearStatus(deviceWearStateRef.current.status);
      }
    }, wearMonitorMs);

    return () => {
      clearInterval(interval);
    };
  }, [muse.signalQuality, muse.status, setWearStatus]);

  useEffect(() => {
    void applyAdaptiveWearTransition({
      autoPaused: autoPausedRef.current,
      pauseAudio: () => {
        player.pause();
        setPlayState('paused');
      },
      pauseSession: async (sessionId, payload) => {
        const response = await pauseAdaptiveSession(sessionId, payload);
        await refreshSession();

        return response;
      },
      resumeSession: async (sessionId) => {
        const response = await resumeAdaptiveSession(sessionId);
        await refreshSession();

        return response;
      },
      sessionId: route.params.sessionId,
      setAutoPaused: (value) => {
        autoPausedRef.current = value;
      },
      startCapture: startCaptureLoop,
      stopCapture: stopCaptureLoop,
      wearStatus,
    }).catch(() => {
      setError('착용 상태 변경을 세션에 반영하지 못했어요.');
    });
  }, [player, refreshSession, route.params.sessionId, startCaptureLoop, stopCaptureLoop, wearStatus]);

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
        {wearStatus === 'off' ? <WearOffOverlay /> : null}

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

        <AdaptiveEegDashboard animatedStyle={graphAnimatedStyle} data={graphData} />
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

function WearOffOverlay() {
  return (
    <View style={styles.wearOverlay}>
      <Text style={styles.segmentTitle}>Muse 착용을 확인해 주세요</Text>
      <Text style={styles.body}>
        EEG 신호가 끊겨 세션을 잠시 멈췄습니다. 다시 착용하면 자동으로 이어집니다.
      </Text>
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

function AdaptiveEegDashboard({
  animatedStyle,
  data,
}: {
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
  data: AdaptiveGraphData;
}) {
  const deltaText = data.deltas.length > 0
    ? data.deltas.map((delta) => delta.text).join(' · ')
    : '상태 변화가 쌓이면 여기에 표시됩니다.';

  return (
    <Animated.View style={[styles.graphPanel, animatedStyle]}>
      <View style={styles.graphHeader}>
        <View>
          <Text style={styles.label}>실시간 EEG</Text>
          <Text style={styles.segmentTitle}>5밴드 트렌드</Text>
        </View>
        <Text style={styles.windowCount}>{data.timeline.length} windows</Text>
      </View>

      {data.hasData ? (
        <>
          <BandTrendChart series={data.series} />
          <View style={styles.bandLegend}>
            {data.series.map((series) => (
              <View key={series.key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: bandColors[series.key] }]} />
                <Text style={styles.legendText}>{series.label}</Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.graphEmpty}>
          <Text style={styles.body}>아직 제출된 EEG 윈도우가 없어요.</Text>
          <Text style={styles.body}>캡처가 끝나면 밴드 흐름이 표시됩니다.</Text>
        </View>
      )}

      <View style={styles.deltaPanel}>
        <Text style={styles.label}>최근 5분 상태 변화</Text>
        <Text style={styles.deltaText}>{deltaText}</Text>
      </View>

      <Timeline points={data.timeline} />
    </Animated.View>
  );
}

function BandTrendChart({ series }: { series: BandSeries[] }) {
  return (
    <View style={styles.chartFrame}>
      <Svg height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%">
        <Path
          d={`M ${chartPadding} ${chartPadding} H ${chartWidth - chartPadding} V ${chartHeight - chartPadding} H ${chartPadding} Z`}
          fill={color.bg.overlay}
          opacity={space.xs / space.md}
        />
        {series.map((band) => {
          const path = buildSeriesPath(band);

          return (
            <Path
              d={path}
              fill="none"
              key={band.key}
              opacity={band.points.length > 0 ? 1 : 0}
              stroke={bandColors[band.key]}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={space.xxs}
            />
          );
        })}
        {series.map((band) => {
          const point = latestPoint(band);

          if (!point) {
            return null;
          }

          return (
            <Circle
              cx={point.x}
              cy={point.y}
              fill={bandColors[band.key]}
              key={`${band.key}-point`}
              r={space.xs}
            />
          );
        })}
      </Svg>
    </View>
  );
}

function Timeline({ points }: { points: TimelinePoint[] }) {
  if (points.length === 0) {
    return (
      <View style={styles.timelinePanel}>
        <Text style={styles.label}>변화 타임라인</Text>
        <Text style={styles.body}>윈도우가 쌓이면 dominant band 흐름을 보여줍니다.</Text>
      </View>
    );
  }

  return (
    <View style={styles.timelinePanel}>
      <Text style={styles.label}>변화 타임라인</Text>
      <View style={styles.timelineRow}>
        {points.map((point) => (
          <View key={point.id} style={styles.timelineItem}>
            <View style={[styles.timelineDot, !point.signalOk && styles.timelineDotMuted]} />
            <Text style={styles.timelineBand}>{shortBand(point.dominantBand)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function buildSeriesPath(series: BandSeries) {
  return series.points
    .map((point, index) => {
      const x = pointX(index, series.points.length);
      const y = pointY(point.normalized);

      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

function latestPoint(series: BandSeries) {
  const point = series.points[series.points.length - 1];

  if (!point) {
    return null;
  }

  return {
    x: pointX(series.points.length - 1, series.points.length),
    y: pointY(point.normalized),
  };
}

function pointX(index: number, total: number) {
  if (total <= 1) {
    return chartWidth - chartPadding;
  }

  return chartPadding + (index / (total - 1)) * (chartWidth - chartPadding * 2);
}

function pointY(normalized: number) {
  const clamped = Math.max(0, Math.min(normalized, 1));

  return chartPadding + (1 - clamped) * (chartHeight - chartPadding * 2);
}

function shortBand(band: string | null) {
  switch (band?.toLowerCase()) {
    case 'alpha':
      return 'α';
    case 'beta':
      return 'β';
    case 'theta':
      return 'θ';
    case 'delta':
      return 'δ';
    case 'gamma':
      return 'γ';
    default:
      return '·';
  }
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
  bandLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  chartFrame: {
    backgroundColor: color.bg.surfaceAlt,
    borderColor: color.border.subtle,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  deltaPanel: {
    backgroundColor: color.bg.surfaceAlt,
    borderColor: color.border.subtle,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: space.xs,
    padding: space.md,
  },
  deltaText: {
    color: color.text.primary,
    fontFamily: type.h3.family,
    fontSize: type.h3.size,
    fontWeight: type.h3.weight,
    lineHeight: type.h3.lineHeight,
  },
  deferredPanel: {
    backgroundColor: color.bg.glass,
    borderColor: color.border.default,
    borderRadius: radius['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
    gap: space.sm,
    padding: space.lg,
  },
  graphEmpty: {
    backgroundColor: color.bg.surfaceAlt,
    borderColor: color.border.subtle,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    gap: space.xs,
    padding: space.lg,
  },
  graphHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  graphPanel: {
    backgroundColor: color.bg.glass,
    borderColor: color.border.default,
    borderRadius: radius['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
    gap: space.lg,
    padding: space.lg,
  },
  wearOverlay: {
    backgroundColor: color.bg.overlay,
    borderColor: color.state.warning,
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
  legendDot: {
    borderRadius: radius.pill,
    height: space.sm,
    width: space.sm,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
  },
  legendText: {
    color: color.text.secondary,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
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
  timelineBand: {
    color: color.text.tertiary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    lineHeight: type.caption.lineHeight,
  },
  timelineDot: {
    backgroundColor: color.brand.accent,
    borderRadius: radius.pill,
    height: space.sm,
    width: space.sm,
  },
  timelineDotMuted: {
    backgroundColor: color.text.disabled,
  },
  timelineItem: {
    alignItems: 'center',
    gap: space.xs,
  },
  timelinePanel: {
    gap: space.sm,
  },
  timelineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  title: {
    color: color.text.primary,
    fontFamily: type.h1.family,
    fontSize: type.h1.size,
    fontWeight: type.h1.weight,
    lineHeight: type.h1.lineHeight,
  },
  windowCount: {
    color: color.text.tertiary,
    fontFamily: type.tabular.family,
    fontSize: type.tabular.size,
    fontWeight: type.tabular.weight,
    lineHeight: type.tabular.lineHeight,
  },
});
