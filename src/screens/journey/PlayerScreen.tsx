import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { resolveAudioSource } from '@/audio/resolveAudioSource';
import { ScreenBackdrop } from '@/components/backdrop/ScreenBackdrop';
import { PlanetImage } from '@/components/PlanetImage';
import { Button } from '@/components/ui';
import { noosTelemetry } from '@/lib/telemetry';
import { useReducedMotion } from '@/lib/useReducedMotion';
import type { JourneyStackParamList } from '@/navigation/JourneyStack';
import { AudioLoadErrorCard } from '@/screens/journey/AudioLoadErrorCard';
import { getAudioPlaybackStatus } from '@/screens/journey/audioPlaybackError';
import { useSessionStore } from '@/stores/sessionStore';
import { normalizePlanetId } from '@/stores/stateStore';
import { color, motion, PLANET_COLORS, PLANETS, radius, space, type } from '@/theme';

type PlayerProps = NativeStackScreenProps<JourneyStackParamList, 'Journey/Player'>;
type PlayState = 'loading' | 'playing' | 'paused' | 'ended' | 'error';

const waveformBars: Array<keyof typeof space> = [
  '2xl',
  '4xl',
  '3xl',
  '5xl',
  '3xl',
  '6xl',
  '4xl',
  '2xl',
  '5xl',
  '3xl',
  '4xl',
  '2xl',
];

export function PlayerScreen({ navigation, route }: PlayerProps) {
  const insets = useSafeAreaInsets();
  const active = useSessionStore((state) => state.active);
  const setActive = useSessionStore((state) => state.setActive);
  const setStatus = useSessionStore((state) => state.setStatus);
  const source = useMemo(() => resolveAudioSource(active), [active]);
  const player = useAudioPlayer(source, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const [playState, setPlayState] = useState<PlayState>('loading');
  const [retryingAudio, setRetryingAudio] = useState(false);
  const startedRef = useRef(false);
  const endedRef = useRef(false);
  const errorRef = useRef(false);
  const activeMatchesRoute = active?.sessionId === route.params.sessionId;
  const durationSec = status.duration || active?.audio?.durationSec || active?.durationSec || 0;
  const positionSec = status.currentTime || 0;
  const progress = durationSec > 0 ? Math.min(positionSec / durationSec, 1) : 0;
  const playbackStatus = getAudioPlaybackStatus({
    hasLoadError: playState === 'error',
    hasSession: Boolean(activeMatchesRoute && active),
  });

  useEffect(() => {
    void setAudioModeAsync({
      interruptionMode: 'duckOthers',
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    });
  }, []);

  useEffect(() => {
    if (!activeMatchesRoute || !active) {
      return;
    }

    if (status.error && !errorRef.current) {
      errorRef.current = true;
      setPlayState('error');
      noosTelemetry.track('player_error', {
        code: status.error,
        positionSec: Math.round(positionSec),
      });
      return;
    }

    if (status.didJustFinish && !endedRef.current) {
      endedRef.current = true;
      setPlayState('ended');
      setStatus('completed');
      noosTelemetry.track('player_end_natural');
      navigation.navigate('Journey/Feedback', { sessionId: active.sessionId });
      return;
    }

    if (status.isLoaded && !startedRef.current) {
      startedRef.current = true;
      player.play();
      setStatus('playing');
      setPlayState('playing');
      noosTelemetry.track('player_start', {
        audioId: active.audio?.audioId ?? 'sample',
        sessionId: active.sessionId,
      });
      return;
    }

    if (status.playing) {
      setPlayState('playing');
    } else if (status.isLoaded && playState !== 'ended' && playState !== 'error') {
      setPlayState('paused');
    }
  }, [
    active,
    activeMatchesRoute,
    navigation,
    playState,
    player,
    positionSec,
    setStatus,
    status.didJustFinish,
    status.error,
    status.isLoaded,
    status.playing,
  ]);

  function goToday() {
    navigation.getParent()?.navigate('Today');
  }

  function togglePlayback() {
    if (!status.isLoaded || playState === 'error') {
      return;
    }

    if (status.playing) {
      player.pause();
      setStatus('paused');
      setPlayState('paused');
      noosTelemetry.track('player_pause', { positionSec: Math.round(positionSec) });
      return;
    }

    player.play();
    setStatus('playing');
    setPlayState('playing');
  }

  async function seekBy(deltaSec: number) {
    if (!status.isLoaded) {
      return;
    }

    await player.seekTo(Math.max(0, Math.min(positionSec + deltaSec, durationSec)));
  }

  async function retryPlayback() {
    if (!active || retryingAudio) {
      return;
    }

    errorRef.current = false;
    setPlayState('loading');
    setRetryingAudio(true);
    noosTelemetry.track('player_retry_tap', {
      audioId: active.audio?.audioId ?? null,
      sessionId: active.sessionId,
    });

    try {
      const { noosApi } = await import('@/api/noosApi');
      const response = await noosApi.sessions.get(active.sessionId);
      const refreshedActive = {
        ...active,
        audio: response.audio ?? active.audio,
        durationSec: response.durationSec,
        lighting: response.lighting ?? active.lighting,
        planet: normalizePlanetId(response.planet),
        summary: response.summary ?? active.summary,
      };

      setActive(refreshedActive);
      player.replace(resolveAudioSource(refreshedActive));
    } catch {
      player.replace(source);
    } finally {
      setRetryingAudio(false);
    }

    player.play();
  }

  function endSession() {
    if (!active) {
      return;
    }

    player.pause();
    setStatus('completed');
    setPlayState('ended');
    noosTelemetry.track('player_end_manual', {
      durationSec: Math.round(durationSec),
      positionSec: Math.round(positionSec),
    });
    // DEC-011: lighting is disconnected in MVP, so no lighting.stop call is made.
    navigation.navigate('Journey/Feedback', { sessionId: active.sessionId });
  }

  if (!activeMatchesRoute || !active) {
    return (
      <ScreenBackdrop style={[styles.empty, { paddingTop: insets.top + space['3xl'] }]}>
        <Text style={styles.title}>재생할 세션이 없어요</Text>
        <Text style={styles.bodyText}>준비 완료된 세션에서 다시 재생을 시작해 주세요.</Text>
        <Button label="Today로 이동" onPress={goToday} />
      </ScreenBackdrop>
    );
  }

  const planet = PLANETS[active.planet];

  return (
    <ScreenBackdrop planet={active.planet}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + space['6xl'],
            paddingTop: insets.top + space.xl,
          },
        ]}
      >
        <LightingStatusPill />

        <View style={styles.stage}>
          <View pointerEvents="none" style={styles.planetAura} />
          <PlanetImage planet={active.planet} round size={orbSize} style={styles.planetImage} />
        </View>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>{planet.title}</Text>
          <Text style={styles.title}>{active.summary?.title ?? planet.trackName}</Text>
          <Text style={styles.bodyText}>{active.summary?.description ?? planet.description}</Text>
        </View>

        <Waveform active={status.playing && playState === 'playing'} planet={active.planet} />

        {playbackStatus === 'loadError' ? (
          <AudioLoadErrorCard
            loading={retryingAudio}
            onRetry={() => void retryPlayback()}
            onSecondaryPress={goToday}
            secondaryLabel="Today로 이동"
            surface="single"
          />
        ) : (
          <View style={styles.playerPanel}>
            <ProgressBar planet={active.planet} progress={progress} />
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(positionSec)}</Text>
              <Text style={styles.timeText}>{formatTime(durationSec)}</Text>
            </View>
            <View style={styles.controls}>
              <IconControl
                accessibilityLabel="15초 뒤로 이동"
                label="↺"
                secondaryLabel="15"
                onPress={() => void seekBy(-15)}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={status.playing ? '일시정지' : '재생'}
                onPress={togglePlayback}
                style={styles.playButton}
              >
                {playState === 'loading' ? (
                  <ActivityIndicator color={color.text.inverse} />
                ) : (
                  <Text style={styles.playButtonText}>{status.playing ? 'Ⅱ' : '▶'}</Text>
                )}
              </Pressable>
              <IconControl
                accessibilityLabel="15초 앞으로 이동"
                label="↻"
                secondaryLabel="15"
                onPress={() => void seekBy(15)}
              />
            </View>
          </View>
        )}

        <Button fullWidth label="세션 종료" onPress={endSession} variant="destructive" />
      </ScrollView>
    </ScreenBackdrop>
  );
}

function LightingStatusPill() {
  return (
    <View style={styles.lightingPill}>
      <View style={styles.lightingDot} />
      <Text style={styles.lightingText}>조명 OFF · 조명 미연결</Text>
    </View>
  );
}

function Waveform({ active, planet }: { active: boolean; planet: keyof typeof PLANETS }) {
  return (
    <View style={styles.waveform}>
      {waveformBars.map((height, index) => (
        <WaveformBar
          active={active}
          baseHeight={space[height]}
          colorValue={PLANET_COLORS[planet].secondary}
          index={index}
          key={`${height}-${index}`}
        />
      ))}
    </View>
  );
}

function WaveformBar({
  active,
  baseHeight,
  colorValue,
  index,
}: {
  active: boolean;
  baseHeight: number;
  colorValue: string;
  index: number;
}) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!active || reduceMotion) {
      pulse.value = withTiming(1, {
        duration: motion.duration.fast,
        easing: motion.easing.decel,
      });
      return;
    }

    pulse.value = withDelay(
      index * motion.stagger.waveBar,
      withRepeat(
        withTiming(1.34, {
          duration: motion.duration.wave,
          easing: motion.easing.standard,
        }),
        -1,
        true
      )
    );
  }, [active, index, pulse, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: pulse.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.waveformBar,
        {
          backgroundColor: colorValue,
          height: baseHeight,
        },
        animatedStyle,
      ]}
    />
  );
}

function IconControl({
  accessibilityLabel,
  label,
  onPress,
  secondaryLabel,
}: {
  accessibilityLabel: string;
  label: string;
  onPress: () => void;
  secondaryLabel: string;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.iconControl}
    >
      <Text style={styles.iconControlSymbol}>{label}</Text>
      <Text style={styles.iconControlMeta}>{secondaryLabel}</Text>
    </Pressable>
  );
}

function ProgressBar({ planet, progress }: { planet: keyof typeof PLANETS; progress: number }) {
  const reduceMotion = useReducedMotion();
  const animatedProgress = useSharedValue(progress);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: reduceMotion ? motion.duration.xfast : motion.duration.base,
      easing: motion.easing.decel,
    });
  }, [animatedProgress, progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${Math.round(animatedProgress.value * 100)}%`,
  }));

  return (
    <View style={styles.progressTrack}>
      <Animated.View
        style={[
          styles.progressFill,
          {
            backgroundColor: PLANET_COLORS[planet].secondary,
          },
          animatedStyle,
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

const orbSize = space['6xl'] * 2 + space.xl;

const styles = StyleSheet.create({
  bodyText: {
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
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
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
    paddingHorizontal: space.sm,
  },
  iconControl: {
    alignItems: 'center',
    backgroundColor: color.bg.glass,
    borderColor: color.border.default,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: space['6xl'],
    justifyContent: 'center',
    width: space['6xl'],
  },
  iconControlMeta: {
    color: color.text.tertiary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    lineHeight: type.caption.lineHeight,
    marginTop: -space.xs,
  },
  iconControlSymbol: {
    color: color.text.primary,
    fontFamily: type.bodyMd.family,
    fontSize: type.h2.size,
    fontWeight: type.h2.weight,
    lineHeight: type.h2.lineHeight,
  },
  stage: {
    alignItems: 'center',
    aspectRatio: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lightingDot: {
    backgroundColor: color.text.disabled,
    borderRadius: radius.pill,
    height: space.sm,
    width: space.sm,
  },
  lightingPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: color.bg.surfaceAlt,
    borderColor: color.border.default,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  lightingText: {
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
  planetAura: {
    backgroundColor: color.bg.overlay,
    borderRadius: radius.pill,
    height: orbSize + space['5xl'],
    opacity: 0.28,
    position: 'absolute',
    width: orbSize + space['5xl'],
  },
  playButton: {
    alignItems: 'center',
    backgroundColor: color.brand.accent,
    borderColor: color.border.strong,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    height: space['6xl'] + space.xl,
    justifyContent: 'center',
    width: space['6xl'] + space.xl,
  },
  playButtonText: {
    color: color.text.inverse,
    fontFamily: type.h2.family,
    fontSize: type.h2.size,
    fontWeight: type.h2.weight,
    lineHeight: type.h2.lineHeight,
  },
  playerPanel: {
    gap: space.xl,
    paddingVertical: space.sm,
  },
  progressFill: {
    borderRadius: radius.pill,
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  progressTrack: {
    backgroundColor: color.bg.glass,
    borderRadius: radius.pill,
    height: space.md,
    overflow: 'hidden',
  },
  stack: {
    gap: space.md,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: color.text.tertiary,
    fontFamily: type.tabular.family,
    fontSize: type.tabular.size,
    fontWeight: type.tabular.weight,
    lineHeight: type.tabular.lineHeight,
  },
  title: {
    color: color.text.primary,
    fontFamily: type.h1.family,
    fontSize: type.h1.size,
    fontWeight: type.h1.weight,
    lineHeight: type.h1.lineHeight,
  },
  waveform: {
    alignItems: 'center',
    backgroundColor: color.bg.glass,
    borderColor: color.border.default,
    borderRadius: radius['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space['2xl'],
  },
  waveformBar: {
    borderRadius: radius.pill,
    opacity: 0.82,
    width: space.xs,
  },
});
