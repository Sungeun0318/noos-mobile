import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { startAdaptiveSession } from '@/api/adaptiveGateway';
import { ScreenBackdrop } from '@/components/backdrop/ScreenBackdrop';
import { Button, Card, Toast } from '@/components/ui';
import { noosTelemetry } from '@/lib/telemetry';
import type { MeasureStackParamList } from '@/navigation/MeasureStack';
import { useAdaptiveSessionStore } from '@/stores/adaptiveSessionStore';
import { useDeviceStore, type MuseStatus } from '@/stores/deviceStore';
import { color, radius, space, type } from '@/theme';

type MeasureHomeNavigation = NativeStackNavigationProp<MeasureStackParamList, 'Measure/Home'>;
type MeasureMethod = 'muse' | 'manual';

const statusLabels: Record<MuseStatus, string> = {
  connected: 'Muse 연결됨',
  connecting: 'Muse 연결 중',
  error: 'Muse 오류',
  idle: 'Muse 미연결',
  measuring: 'Muse 측정 중',
  scanning: 'Muse 검색 중',
};

export function MeasureHomeScreen() {
  const navigation = useNavigation<MeasureHomeNavigation>();
  const muse = useDeviceStore((state) => state.muse);
  const applyStartResponse = useAdaptiveSessionStore((state) => state.applyStartResponse);
  const [adaptiveError, setAdaptiveError] = useState<string | null>(null);
  const [startingAdaptive, setStartingAdaptive] = useState(false);

  function selectMethod(method: MeasureMethod) {
    noosTelemetry.track('measure_method_select', { method });
    navigation.navigate(method === 'muse' ? 'Measure/MuseConnect' : 'Measure/Manual');
  }

  async function startAdaptive() {
    const seedSource = muse.status === 'connected' || muse.status === 'measuring' ? 'eeg' : 'none';

    setAdaptiveError(null);
    setStartingAdaptive(true);

    try {
      const response = await startAdaptiveSession({
        planetHint: 'Neptune',
        seedSource,
      });

      applyStartResponse(response, {
        planetHint: 'Neptune',
        seedSource,
      });
      noosTelemetry.track('adaptive_session_start_tap', { seedSource });
      navigation.getParent()?.navigate('Journey', {
        params: { sessionId: response.sessionId },
        screen: 'Journey/AdaptivePlayer',
      });
    } catch {
      setAdaptiveError('적응형 세션을 시작하지 못했어요. 연결 상태를 확인해 주세요.');
    } finally {
      setStartingAdaptive(false);
    }
  }

  return (
    <ScreenBackdrop planet="earth">
      <ScrollView contentContainerStyle={styles.content}>
        {adaptiveError ? <Toast message={adaptiveError} variant="danger" /> : null}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Measure</Text>
          <Text style={styles.title}>측정 방식 선택</Text>
          <Text style={styles.description}>Muse 시뮬레이션 또는 수동 설문으로 상태를 만들 수 있습니다.</Text>
        </View>

        <DeviceStatusInline status={muse.status} signalQuality={muse.signalQuality} />

        <Card level={2} padding="xl" variant="glass">
          <View style={styles.adaptiveCard}>
            <View style={styles.adaptiveCopy}>
              <Text style={styles.cardTitle}>적응형 세션 시작</Text>
              <Text style={styles.description}>
                Muse 신호를 5분 단위로 읽고, 다음 세그먼트 생성 상태를 플레이어에서 확인합니다.
              </Text>
            </View>
            <Button
              fullWidth
              label="적응형 세션 시작"
              loading={startingAdaptive}
              onPress={startAdaptive}
              size="lg"
            />
          </View>
        </Card>

        <View style={styles.stack}>
          <MeasureMethodCard
            description="Muse 연결 후 EEG만 측정하거나, 설문을 더해 hybrid 결과로 진행합니다."
            label="Muse로 측정"
            method="muse"
            onPress={() => selectMethod('muse')}
            tag="빠른 측정"
          />
          <MeasureMethodCard
            description="19문항 검증 설문으로 지금의 집중, 스트레스, 피로, 이완 상태를 계산합니다."
            label="설문으로 측정"
            method="manual"
            onPress={() => selectMethod('manual')}
            tag="검증 설문"
          />
        </View>
      </ScrollView>
    </ScreenBackdrop>
  );
}

function DeviceStatusInline({
  status,
  signalQuality,
}: {
  status: MuseStatus;
  signalQuality: number;
}) {
  const connected = status === 'connected' || status === 'measuring';

  return (
    <View style={styles.statusRow}>
      <View style={[styles.statusDot, connected && styles.statusDotOn]} />
      <Text style={styles.statusText}>{statusLabels[status]}</Text>
      {connected ? <Text style={styles.statusMeta}>{Math.round(signalQuality * 100)}%</Text> : null}
    </View>
  );
}

function MeasureMethodCard({
  label,
  description,
  method,
  tag,
  onPress,
}: {
  label: string;
  description: string;
  method: MeasureMethod;
  tag: string;
  onPress: () => void;
}) {
  return (
    <Card level={2} onPress={onPress} padding="xl" variant="hero">
      <View style={styles.methodRow}>
        <MethodIcon method={method} />
        <View style={styles.cardStack}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{label}</Text>
            <Text style={styles.tag}>{tag}</Text>
          </View>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>
    </Card>
  );
}

function MethodIcon({ method }: { method: MeasureMethod }) {
  if (method === 'muse') {
    return (
      <View style={styles.methodIcon}>
        <View style={styles.waveRow}>
          <View style={[styles.waveBar, styles.waveBarShort]} />
          <View style={[styles.waveBar, styles.waveBarTall]} />
          <View style={[styles.waveBar, styles.waveBarMid]} />
          <View style={[styles.waveBar, styles.waveBarTall]} />
          <View style={[styles.waveBar, styles.waveBarShort]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.methodIcon}>
      <View style={styles.surveyGlyph}>
        <View style={styles.surveyLine} />
        <View style={[styles.surveyLine, styles.surveyLineShort]} />
        <View style={styles.surveyDots}>
          <View style={styles.surveyDot} />
          <View style={styles.surveyDot} />
          <View style={styles.surveyDot} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  adaptiveCard: {
    gap: space.lg,
  },
  adaptiveCopy: {
    gap: space.sm,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    justifyContent: 'space-between',
  },
  cardStack: {
    flex: 1,
    flexShrink: 1,
    gap: space.sm,
    minWidth: 0,
  },
  cardTitle: {
    color: color.text.primary,
    flexShrink: 1,
    fontFamily: type.h2.family,
    fontSize: type.h2.size,
    fontWeight: type.h2.weight,
    lineHeight: type.h2.lineHeight,
  },
  content: {
    gap: space.xl,
    padding: space.xl,
  },
  methodIcon: {
    alignItems: 'center',
    backgroundColor: color.bg.glass,
    borderColor: color.border.default,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: space['6xl'],
    justifyContent: 'center',
    flexShrink: 0,
    width: space['6xl'],
  },
  methodRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.lg,
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
  stack: {
    gap: space.lg,
  },
  statusDot: {
    backgroundColor: color.text.disabled,
    borderRadius: radius.pill,
    height: space.md,
    width: space.md,
  },
  statusDotOn: {
    backgroundColor: color.state.success,
  },
  statusMeta: {
    color: color.text.tertiary,
    fontFamily: type.tabular.family,
    fontSize: type.tabular.size,
    fontWeight: type.tabular.weight,
    lineHeight: type.tabular.lineHeight,
  },
  statusRow: {
    alignItems: 'center',
    backgroundColor: color.bg.glass,
    borderColor: color.border.default,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: space.sm,
    padding: space.lg,
  },
  statusText: {
    color: color.text.primary,
    flex: 1,
    fontFamily: type.bodyMd.family,
    fontSize: type.bodyMd.size,
    fontWeight: type.bodyMd.weight,
    lineHeight: type.bodyMd.lineHeight,
  },
  surveyDot: {
    backgroundColor: color.brand.accent,
    borderRadius: radius.pill,
    height: space.xs,
    width: space.xs,
  },
  surveyDots: {
    flexDirection: 'row',
    gap: space.xs,
  },
  surveyGlyph: {
    gap: space.xs,
    width: space['3xl'],
  },
  surveyLine: {
    backgroundColor: color.text.primary,
    borderRadius: radius.pill,
    height: space.xs,
    width: '100%',
  },
  surveyLineShort: {
    width: '72%',
  },
  tag: {
    color: color.brand.accent,
    fontFamily: type.caption.family,
    flexShrink: 0,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    letterSpacing: 0.4,
    lineHeight: type.caption.lineHeight,
  },
  title: {
    color: color.text.primary,
    fontFamily: type.h1.family,
    fontSize: type.h1.size,
    fontWeight: type.h1.weight,
    lineHeight: type.h1.lineHeight,
  },
  waveBar: {
    backgroundColor: color.brand.accent,
    borderRadius: radius.pill,
    width: space.xs,
  },
  waveBarMid: {
    height: space.xl,
  },
  waveBarShort: {
    height: space.lg,
  },
  waveBarTall: {
    height: space['3xl'],
  },
  waveRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
  },
});
