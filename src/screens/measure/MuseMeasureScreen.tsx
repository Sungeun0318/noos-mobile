import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Toast } from '@/components/ui';
import { noosTelemetry } from '@/lib/telemetry';
import type { MeasureStackParamList } from '@/navigation/MeasureStack';
import { measureMock } from '@/screens/measure/measureMock';
import { museSimulator } from '@/screens/measure/museSimulator';
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
  const setMuseStatus = useDeviceStore((state) => state.setMuseStatus);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [sampleBufferLen, setSampleBufferLen] = useState(0);
  const [signalScore, setSignalScore] = useState(0.72);
  const [phase, setPhase] = useState<MeasurePhase>('warmup');
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    async function runMeasure() {
      cancelledRef.current = false;
      setMuseStatus('measuring');
      noosTelemetry.track('muse_measure_start');

      try {
        const eeg = await museSimulator.measure(measureDurationSec, (tick) => {
          if (cancelledRef.current) {
            return;
          }

          setElapsedSec(tick.elapsedSec);
          setSampleBufferLen(tick.sampleBufferLen);
          setSignalScore(tick.signalScore);
          setPhase(tick.elapsedSec < warmupSec ? 'warmup' : 'recording');
        });

        if (cancelledRef.current) {
          return;
        }

        setPhase('finalizing');
        const response = await measureMock(surveyDraft, eeg);
        setFromMeasure(response);
        setMuseStatus('connected');
        noosTelemetry.track('muse_measure_complete', {
          sampleCount: eeg.sampleCount,
          signalScore: eeg.signalQuality,
        });
        navigation.navigate('Measure/Result');
      } catch {
        setError('Muse 측정을 완료하지 못했어요. 다시 시도해 주세요.');
        setMuseStatus('connected');
        noosTelemetry.track('muse_measure_abort', { reason: 'error' });
      }
    }

    void runMeasure();

    return () => {
      cancelledRef.current = true;
    };
  }, [navigation, setFromMeasure, setMuseStatus, surveyDraft]);

  function cancel() {
    cancelledRef.current = true;
    setMuseStatus('connected');
    noosTelemetry.track('muse_measure_abort', { reason: 'cancel' });
    navigation.goBack();
  }

  const progress = elapsedSec / measureDurationSec;

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      {error ? <Toast message={error} variant="danger" /> : null}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Muse EEG</Text>
        <Text style={styles.title}>60초 동안 측정 중</Text>
        <Text style={styles.description}>화면을 켜둔 채로 편하게 호흡해.</Text>
      </View>

      <Card level={1} padding="xl">
        <View style={styles.measureStack}>
          <View style={styles.qualityRow}>
            <Text style={styles.cardTitle}>신호 품질</Text>
            <Text style={styles.metric}>{Math.round(signalScore * 100)}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { flex: progress }]} />
            <View style={{ flex: 1 - progress }} />
          </View>
          <View style={styles.qualityRow}>
            <Text style={styles.description}>{phaseLabel(phase)}</Text>
            <Text style={styles.metric}>{elapsedSec}s / {measureDurationSec}s</Text>
          </View>
        </View>
      </Card>

      <Card level={2} padding="lg">
        <View style={styles.measureStack}>
          <Text style={styles.cardTitle}>샘플 버퍼</Text>
          <Text style={styles.description}>{sampleBufferLen} samples · Muse-SIM</Text>
        </View>
      </Card>

      <Button fullWidth label="측정 취소" onPress={cancel} variant="secondary" />
    </ScrollView>
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
  container: {
    backgroundColor: color.bg.base,
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
  progressFill: {
    backgroundColor: color.brand.accent,
    borderRadius: radius.pill,
  },
  progressTrack: {
    backgroundColor: color.border.default,
    borderRadius: radius.pill,
    flexDirection: 'row',
    height: space.sm,
    overflow: 'hidden',
  },
  qualityRow: {
    alignItems: 'center',
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
