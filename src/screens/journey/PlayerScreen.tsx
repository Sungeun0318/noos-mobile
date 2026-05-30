import { LinearGradient } from 'expo-linear-gradient';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { resolveAudioSource } from '@/audio/resolveAudioSource';
import { Button, Toast } from '@/components/ui';
import { noosTelemetry } from '@/lib/telemetry';
import type { JourneyStackParamList } from '@/navigation/JourneyStack';
import { useSessionStore } from '@/stores/sessionStore';
import { color, planetGradient, PLANET_COLORS, PLANETS, radius, space, type } from '@/theme';

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
  const setStatus = useSessionStore((state) => state.setStatus);
  const source = useMemo(() => resolveAudioSource(active), [active]);
  const player = useAudioPlayer(source, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const [playState, setPlayState] = useState<PlayState>('loading');
  const startedRef = useRef(false);
  const endedRef = useRef(false);
  const errorRef = useRef(false);
  const activeMatchesRoute = active?.sessionId === route.params.sessionId;
  const durationSec = status.duration || active?.audio?.durationSec || active?.durationSec || 0;
  const positionSec = status.currentTime || 0;
  const progress = durationSec > 0 ? Math.min(positionSec / durationSec, 1) : 0;

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
      // TODO FE-09: navigate Journey/Feedback.
      navigation.getParent()?.navigate('Today');
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

  function retryPlayback() {
    errorRef.current = false;
    setPlayState('loading');
    player.replace(source);
    player.play();
  }

  function endSession() {
    player.pause();
    setStatus('completed');
    setPlayState('ended');
    noosTelemetry.track('player_end_manual', {
      durationSec: Math.round(durationSec),
      positionSec: Math.round(positionSec),
    });
    // DEC-011: lighting is disconnected in MVP, so no lighting.stop call is made.
    // TODO FE-09: navigate Journey/Feedback.
    goToday();
  }

  if (!activeMatchesRoute || !active) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top + space['3xl'] }]}>
        <Text style={styles.title}>재생할 세션이 없어요</Text>
        <Text style={styles.bodyText}>준비 완료된 세션에서 다시 재생을 시작해 주세요.</Text>
        <Button label="Today로 이동" onPress={goToday} />
      </View>
    );
  }

  const planet = PLANETS[active.planet];
  const gradient = planetGradient(active.planet);

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
        <View style={[styles.planetOrb, { backgroundColor: PLANET_COLORS[active.planet].secondary }]} />
      </LinearGradient>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>{planet.title}</Text>
        <Text style={styles.title}>{active.summary?.title ?? planet.trackName}</Text>
        <Text style={styles.bodyText}>{active.summary?.description ?? planet.description}</Text>
      </View>

      <LightingStatusPill />
      <Waveform planet={active.planet} />

      {playState === 'error' ? (
        <View style={styles.stack}>
          <Toast message="재생에 실패했어요" variant="danger" />
          <Button label="다시 시도" onPress={retryPlayback} variant="secondary" />
          <Button label="Today로 이동" onPress={goToday} variant="ghost" />
        </View>
      ) : (
        <View style={styles.playerPanel}>
          <ProgressBar planet={active.planet} progress={progress} />
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(positionSec)}</Text>
            <Text style={styles.timeText}>{formatTime(durationSec)}</Text>
          </View>
          <View style={styles.controls}>
            <Button label="-15초" onPress={() => void seekBy(-15)} variant="secondary" />
            <Pressable accessibilityRole="button" onPress={togglePlayback} style={styles.playButton}>
              {playState === 'loading' ? (
                <ActivityIndicator color={color.text.inverse} />
              ) : (
                <Text style={styles.playButtonText}>{status.playing ? '일시정지' : '재생'}</Text>
              )}
            </Pressable>
            <Button label="+15초" onPress={() => void seekBy(15)} variant="secondary" />
          </View>
        </View>
      )}

      <Button fullWidth label="세션 종료" onPress={endSession} variant="destructive" />
    </ScrollView>
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

function Waveform({ planet }: { planet: keyof typeof PLANETS }) {
  return (
    <View style={styles.waveform}>
      {waveformBars.map((height, index) => (
        <View
          key={`${height}-${index}`}
          style={[
            styles.waveformBar,
            {
              backgroundColor: PLANET_COLORS[planet].secondary,
              height: space[height],
            },
          ]}
        />
      ))}
    </View>
  );
}

function ProgressBar({ planet, progress }: { planet: keyof typeof PLANETS; progress: number }) {
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

const heroHeight = space['6xl'] * 2;
const orbSize = space['6xl'];

const styles = StyleSheet.create({
  bodyText: {
    color: color.text.secondary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
  },
  container: {
    backgroundColor: color.bg.base,
  },
  content: {
    gap: space.lg,
    paddingHorizontal: space.xl,
  },
  controls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
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
    letterSpacing: 0.4,
    lineHeight: type.caption.lineHeight,
  },
  header: {
    gap: space.sm,
  },
  hero: {
    alignItems: 'center',
    borderRadius: radius['2xl'],
    height: heroHeight,
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
  planetOrb: {
    borderRadius: orbSize / 2,
    height: orbSize,
    opacity: 0.9,
    width: orbSize,
  },
  playButton: {
    alignItems: 'center',
    backgroundColor: color.brand.accent,
    borderRadius: radius.pill,
    height: space['6xl'],
    justifyContent: 'center',
    width: space['6xl'],
  },
  playButtonText: {
    color: color.text.inverse,
    fontFamily: type.bodyMd.family,
    fontSize: type.bodyMd.size,
    fontWeight: type.bodyMd.weight,
    lineHeight: type.bodyMd.lineHeight,
  },
  playerPanel: {
    gap: space.lg,
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
    height: space.sm,
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
    backgroundColor: color.bg.surface,
    borderColor: color.border.subtle,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: space.xs,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.xl,
  },
  waveformBar: {
    borderRadius: radius.pill,
    opacity: 0.75,
    width: space.xs,
  },
});
