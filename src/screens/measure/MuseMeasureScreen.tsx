import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenBackdrop } from '@/components/backdrop/ScreenBackdrop';
import { Button, Card, Toast } from '@/components/ui';
import { noosTelemetry } from '@/lib/telemetry';
import type { MeasureStackParamList } from '@/navigation/MeasureStack';
import { measureMock } from '@/screens/measure/measureMock';
import { museGateway } from '@/screens/measure/museGateway';
import { useDeviceStore } from '@/stores/deviceStore';
import { useStateStore } from '@/stores/stateStore';
import { color, radius, space, type } from '@/theme';

type MuseMeasureNavigation = NativeStackNavigationProp<MeasureStackParamList, 'Measure/MuseMeasure'>;
type MeasurePhase = 'warmup' | 'recording' | 'finalizing';

const measureDurationSec = 60;
const warmupSec = 4;

export function MuseMeasureScreen() {
  useKeepAwake();
  const navigation = useNavigation<MuseMeasureNavigation>();
  const surveyDraft = useStateStore((state) => state.surveyDraft);
  const setFromMeasure = useStateStore((state) => state.setFromMeasure);
  const museDeviceName = useDeviceStore((state) => state.muse.deviceName);
  const setMuseStatus = useDeviceStore((state) => state.setMuseStatus);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [sampleBufferLen, setSampleBufferLen] = useState(0);
  const [signalScore, setSignalScore] = useState(0.72);
  const [phase, setPhase] = useState<MeasurePhase>('warmup');
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    const abortController = new AbortController();

    async function runMeasure() {
      cancelledRef.current = false;
      setMuseStatus('measuring');
      noosTelemetry.track('muse_measure_start');

      try {
        const eeg = await museGateway.measure(measureDurationSec, (tick) => {
          if (cancelledRef.current) {
            return;
          }

          setElapsedSec(tick.elapsedSec);
          setSampleBufferLen(tick.sampleBufferLen);
          setSignalScore(tick.signalScore);
          setPhase(tick.elapsedSec < warmupSec ? 'warmup' : 'recording');
        }, { signal: abortController.signal });

        if (cancelledRef.current) {
          return;
        }

        setPhase('finalizing');
        const response = await measureMock(surveyDraft, eeg);
        setFromMeasure(response, eeg);
        setMuseStatus('connected');
        noosTelemetry.track('muse_measure_complete', {
          sampleCount: eeg.sampleCount,
          signalScore: eeg.signalQuality,
        });
        navigation.navigate('Measure/Result');
      } catch {
        if (cancelledRef.current) {
          return;
        }

        setError('Muse 측정을 완료하지 못했어요. 다시 시도해 주세요.');
        setMuseStatus('connected');
        noosTelemetry.track('muse_measure_abort', { reason: 'error' });
      }
    }

    void runMeasure();

    return () => {
      cancelledRef.current = true;
      abortController.abort();
    };
  }, [navigation, setFromMeasure, setMuseStatus, surveyDraft]);

  function cancel() {
    cancelledRef.current = true;
    setMuseStatus('connected');
    noosTelemetry.track('muse_measure_abort', { reason: 'cancel' });
    navigation.goBack();
  }

  const progress = Math.max(0, Math.min(elapsedSec / measureDurationSec, 1));
  const remainingSec = Math.max(0, measureDurationSec - elapsedSec);

  return (
    <ScreenBackdrop planet="earth">
      <ScrollView contentContainerStyle={styles.content}>
        {error ? <Toast message={error} variant="danger" /> : null}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Muse EEG</Text>
          <Text style={styles.title}>60초 동안 측정 중</Text>
          <Text style={styles.description}>화면을 켜둔 채로 편하게 호흡해 주세요.</Text>
        </View>

        <Card level={2} padding="xl" variant="hero">
          <View style={styles.measureStack}>
            <View style={styles.timerStage}>
              <View style={styles.signalRing}>
                {/* TODO FE-XX: animate this signal ring and band preview with reanimated once approved. */}
                <Text style={styles.timerText}>{remainingSec}</Text>
                <Text style={styles.timerUnit}>sec</Text>
              </View>
            </View>
            <View style={styles.qualityRow}>
              <View>
                <Text style={styles.cardTitle}>신호 품질</Text>
                <Text style={styles.description}>{phaseLabel(phase)}</Text>
              </View>
              <Text style={styles.metricLarge}>{Math.round(signalScore * 100)}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { flex: progress }]} />
              <View style={{ flex: 1 - progress }} />
            </View>
            <View style={styles.qualityRow}>
              <Text style={styles.description}>샘플 {sampleBufferLen}</Text>
              <Text style={styles.metric}>{museDeviceName ?? 'Muse'}</Text>
            </View>
          </View>
        </Card>

        <Card level={1} padding="lg" variant="glass">
          <View style={styles.qualityRow}>
            <Text style={styles.cardTitle}>진행률</Text>
            <Text style={styles.metric}>{elapsedSec}s / {measureDurationSec}s</Text>
          </View>
        </Card>

        <Button fullWidth label="측정 취소" onPress={cancel} variant="secondary" />
      </ScrollView>
    </ScreenBackdrop>
  );
}

function phaseLabel(phase: MeasurePhase) {
  if (phase === 'warmup') {
    return '워밍업';
  }

  if (phase === 'recording') {
    return '기록 중';
  }

  return '정리 중';
}

const styles = StyleSheet.create({
  cardTitle: {
    color: color.text.primary,
    fontFamily: type.h3.family,
    fontSize: type.h3.size,
    fontWeight: type.h3.weight,
    lineHeight: type.h3.lineHeight,
  },
  content: {
    gap: space.xl,
    padding: space.xl,
  },
  description: {
    color: color.text.secondary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
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
  measureStack: {
    gap: space.lg,
  },
  metric: {
    color: color.text.primary,
    fontFamily: type.tabular.family,
    fontSize: type.tabular.size,
    fontWeight: type.tabular.weight,
    lineHeight: type.tabular.lineHeight,
  },
  metricLarge: {
    color: color.text.primary,
    fontFamily: type.display.family,
    fontSize: type.display.size,
    fontWeight: type.display.weight,
    lineHeight: type.display.lineHeight,
  },
  progressFill: {
    backgroundColor: color.brand.accent,
    borderRadius: radius.pill,
  },
  progressTrack: {
    backgroundColor: color.border.default,
    borderRadius: radius.pill,
    flexDirection: 'row',
    height: space.md,
    overflow: 'hidden',
  },
  qualityRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    justifyContent: 'space-between',
  },
  signalRing: {
    alignItems: 'center',
    backgroundColor: color.bg.glass,
    borderColor: color.border.strong,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: space['6xl'] * 2,
    justifyContent: 'center',
    width: space['6xl'] * 2,
  },
  timerStage: {
    alignItems: 'center',
    paddingVertical: space.lg,
  },
  timerText: {
    color: color.text.primary,
    fontFamily: type.display.family,
    fontSize: type.display.size,
    fontWeight: type.display.weight,
    lineHeight: type.display.lineHeight,
  },
  timerUnit: {
    color: color.text.tertiary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
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
