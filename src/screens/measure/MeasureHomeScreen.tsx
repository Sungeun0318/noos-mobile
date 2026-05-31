import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenBackdrop } from '@/components/backdrop/ScreenBackdrop';
import { Card } from '@/components/ui';
import { noosTelemetry } from '@/lib/telemetry';
import type { MeasureStackParamList } from '@/navigation/MeasureStack';
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

  function selectMethod(method: MeasureMethod) {
    noosTelemetry.track('measure_method_select', { method });
    navigation.navigate(method === 'muse' ? 'Measure/MuseConnect' : 'Measure/Manual');
  }

  return (
    <ScreenBackdrop planet="earth">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Measure</Text>
          <Text style={styles.title}>측정 방식을 선택해</Text>
          <Text style={styles.description}>Muse 시뮬레이션 또는 수동 설문으로 상태를 만들 수 있어.</Text>
        </View>

        <DeviceStatusInline status={muse.status} signalQuality={muse.signalQuality} />

        <View style={styles.stack}>
          <MeasureMethodCard
            description="Muse 연결 후 EEG만 측정하거나, 설문을 더해 hybrid 결과로 진행해."
            iconLabel="EEG"
            label="Muse로 측정"
            onPress={() => selectMethod('muse')}
            tag="빠른 측정"
          />
          <MeasureMethodCard
            description="19문항 검증 설문으로 지금의 집중, 스트레스, 피로, 이완 상태를 계산해."
            iconLabel="19"
            label="설문으로 측정"
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
  iconLabel,
  tag,
  onPress,
}: {
  label: string;
  description: string;
  iconLabel: string;
  tag: string;
  onPress: () => void;
}) {
  return (
    <Card level={2} onPress={onPress} padding="xl" variant="hero">
      <View style={styles.methodRow}>
        <View style={styles.methodIcon}>
          <Text style={styles.methodIconText}>{iconLabel}</Text>
        </View>
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

const styles = StyleSheet.create({
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  cardStack: {
    gap: space.sm,
  },
  cardTitle: {
    color: color.text.primary,
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
    width: space['6xl'],
  },
  methodIconText: {
    color: color.text.primary,
    fontFamily: type.h3.family,
    fontSize: type.h3.size,
    fontWeight: type.h3.weight,
    lineHeight: type.h3.lineHeight,
  },
  methodRow: {
    alignItems: 'center',
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
  tag: {
    color: color.brand.accent,
    fontFamily: type.caption.family,
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
});
