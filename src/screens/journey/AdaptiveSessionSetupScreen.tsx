import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { startAdaptiveSession } from '@/api/adaptiveGateway';
import { ScreenBackdrop } from '@/components/backdrop/ScreenBackdrop';
import { PlanetHero } from '@/components/PlanetHero';
import { PlanetImage } from '@/components/PlanetImage';
import { Button, Card, Toast } from '@/components/ui';
import { noosTelemetry } from '@/lib/telemetry';
import type { JourneyStackParamList } from '@/navigation/JourneyStack';
import {
  buildAdaptiveStartRequest,
  getAdaptiveSeedSource,
  toBackendAdaptivePlanet,
} from '@/screens/journey/adaptiveSetupLogic';
import { useAdaptiveSessionStore } from '@/stores/adaptiveSessionStore';
import { useDeviceStore, type MuseStatus } from '@/stores/deviceStore';
import { useStateStore } from '@/stores/stateStore';
import { color, PLANET_COLORS, PLANETS, radius, space, type, type PlanetId } from '@/theme';

type AdaptiveSetupProps = NativeStackScreenProps<JourneyStackParamList, 'Journey/AdaptiveSetup'>;

const planetIds = Object.keys(PLANETS) as PlanetId[];
const heroOrbSize = space['6xl'] + space['4xl'];
const gridOrbSize = space['4xl'];

const museStatusLabels: Record<MuseStatus, string> = {
  connected: 'Muse 연결됨',
  connecting: 'Muse 연결 중',
  error: 'Muse 오류',
  idle: 'Muse 미연결',
  measuring: 'Muse 측정 중',
  scanning: 'Muse 검색 중',
};

export function AdaptiveSessionSetupScreen({ navigation, route }: AdaptiveSetupProps) {
  const insets = useSafeAreaInsets();
  const recommendedPlanet = useStateStore((state) => state.recommendedPlanet);
  const museStatus = useDeviceStore((state) => state.muse.status);
  const signalQuality = useDeviceStore((state) => state.muse.signalQuality);
  const applyStartResponse = useAdaptiveSessionStore((state) => state.applyStartResponse);
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetId>(
    route.params?.recommendedPlanet ?? recommendedPlanet ?? 'neptune',
  );
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const seedSource = getAdaptiveSeedSource(museStatus);
  const planetMeta = PLANETS[selectedPlanet];

  async function startSession() {
    const payload = buildAdaptiveStartRequest({ museStatus, planet: selectedPlanet });

    setSubmitting(true);
    setToast(null);

    try {
      const response = await startAdaptiveSession(payload);
      applyStartResponse(response, payload);
      noosTelemetry.track('adaptive_setup_start_tap', {
        planet: selectedPlanet,
        seedSource: payload.seedSource,
      });
      navigation.navigate('Journey/AdaptivePlayer', { sessionId: response.sessionId });
    } catch {
      setToast('적응형 세션을 시작하지 못했어요. 연결 상태를 확인해 주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenBackdrop planet={selectedPlanet}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + space['6xl'],
            paddingTop: insets.top + space.xl,
          },
        ]}
      >
        {toast ? <Toast message={toast} variant="danger" /> : null}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>적응형 세션</Text>
          <Text style={styles.title}>목표 행성을 선택하세요</Text>
          <Text style={styles.body}>
            선택한 행성을 목표 분위기로 두고, Muse EEG를 5분마다 읽어 다음 음악을 조정합니다.
          </Text>
        </View>

        <PlanetHero imageSize={heroOrbSize} planet={selectedPlanet}>
          <Text style={styles.label}>선택한 목표</Text>
          <Text style={styles.heroTitle}>{planetMeta.title}</Text>
          <Text style={styles.body}>{planetMeta.description}</Text>
          <Text style={styles.heroMood}>{planetMeta.moodTarget}</Text>
        </PlanetHero>

        <AdaptiveStatusCard
          museStatus={museStatus}
          seedSource={seedSource}
          signalQuality={signalQuality}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>행성</Text>
          <View style={styles.grid}>
            {planetIds.map((planetId) => (
              <PlanetOption
                key={planetId}
                planet={planetId}
                recommended={recommendedPlanet === planetId}
                selected={selectedPlanet === planetId}
                onPress={() => setSelectedPlanet(planetId)}
              />
            ))}
          </View>
        </View>

        <SessionPlanCard />

        <Card level={2} padding="lg" variant="glass">
          <View style={styles.ctaStack}>
            <Text style={styles.ctaMeta}>{toBackendAdaptivePlanet(selectedPlanet)} 목표로 세션을 시작합니다.</Text>
            <Button
              fullWidth
              label="적응형 세션 시작"
              loading={submitting}
              onPress={startSession}
              size="lg"
            />
          </View>
        </Card>
      </ScrollView>
    </ScreenBackdrop>
  );
}

function AdaptiveStatusCard({
  museStatus,
  seedSource,
  signalQuality,
}: {
  museStatus: MuseStatus;
  seedSource: string;
  signalQuality: number;
}) {
  const connected = museStatus === 'connected' || museStatus === 'measuring';

  return (
    <Card level={2} padding="lg" variant="glass">
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, connected && styles.statusDotOn]} />
        <View style={styles.cardStack}>
          <Text style={styles.cardTitle}>Muse 상태</Text>
          <Text style={styles.body}>{museStatusLabels[museStatus]}</Text>
        </View>
        <View style={styles.statusMetaStack}>
          <Text style={styles.metaLabel}>{seedSource === 'eeg' ? 'EEG 기반' : '기본 시작'}</Text>
          <Text style={styles.metaValue}>{connected ? `${Math.round(signalQuality * 100)}%` : '대기'}</Text>
        </View>
      </View>
    </Card>
  );
}

function PlanetOption({
  planet,
  recommended,
  selected,
  onPress,
}: {
  planet: PlanetId;
  recommended: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  const meta = PLANETS[planet];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.planetCard,
        selected && styles.planetCardSelected,
        selected && { borderColor: PLANET_COLORS[planet].secondary },
        pressed && styles.pressed,
      ]}
    >
      <PlanetImage
        planet={planet}
        round
        size={gridOrbSize}
        style={[styles.planetImage, selected && styles.planetImageSelected]}
      />
      <Text style={styles.planetTitle}>{meta.title}</Text>
      <Text style={styles.planetMood}>{meta.moodTarget}</Text>
      {recommended ? <Text style={styles.recommendedLabel}>추천</Text> : null}
    </Pressable>
  );
}

function SessionPlanCard() {
  return (
    <Card level={2} padding="lg" variant="glass">
      <View style={styles.planStack}>
        <Text style={styles.cardTitle}>진행 방식</Text>
        <PlanRow label="세션 길이" value="직접 종료할 때까지" />
        <PlanRow label="음악 단위" value="2분 세그먼트" />
        <PlanRow label="EEG 분석" value="5분마다 조정" />
        <Text style={styles.body}>다음 음악이 준비되기 전에는 현재 곡을 끊김 없이 이어 재생합니다.</Text>
      </View>
    </Card>
  );
}

function PlanRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.planRow}>
      <Text style={styles.planLabel}>{label}</Text>
      <Text style={styles.planValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: color.text.secondary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
  },
  cardStack: {
    flex: 1,
    gap: space.xs,
    minWidth: 0,
  },
  cardTitle: {
    color: color.text.primary,
    fontFamily: type.bodyMd.family,
    fontSize: type.bodyMd.size,
    fontWeight: type.bodyMd.weight,
    lineHeight: type.bodyMd.lineHeight,
  },
  content: {
    gap: space.xl,
    paddingHorizontal: space.xl,
  },
  ctaMeta: {
    color: color.text.secondary,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
    textAlign: 'center',
  },
  ctaStack: {
    gap: space.md,
  },
  eyebrow: {
    color: color.text.tertiary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    letterSpacing: 0.4,
    lineHeight: type.caption.lineHeight,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  header: {
    gap: space.sm,
  },
  heroMood: {
    color: color.text.primary,
    fontFamily: type.bodyMd.family,
    fontSize: type.bodyMd.size,
    fontWeight: type.bodyMd.weight,
    lineHeight: type.bodyMd.lineHeight,
  },
  heroTitle: {
    color: color.text.primary,
    fontFamily: type.display.family,
    fontSize: type.display.size,
    fontWeight: type.display.weight,
    lineHeight: type.display.lineHeight,
  },
  label: {
    color: color.text.tertiary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    letterSpacing: 0.4,
    lineHeight: type.caption.lineHeight,
  },
  metaLabel: {
    color: color.text.tertiary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    letterSpacing: 0.4,
    lineHeight: type.caption.lineHeight,
    textAlign: 'right',
  },
  metaValue: {
    color: color.text.primary,
    fontFamily: type.tabular.family,
    fontSize: type.tabular.size,
    fontWeight: type.tabular.weight,
    lineHeight: type.tabular.lineHeight,
    textAlign: 'right',
  },
  planetCard: {
    alignItems: 'center',
    backgroundColor: color.bg.glass,
    borderColor: color.border.subtle,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    flexBasis: '31%',
    gap: space.xs,
    minHeight: space['6xl'] + space.lg,
    padding: space.md,
  },
  planetCardSelected: {
    backgroundColor: color.bg.hero,
    transform: [{ scale: 1.03 }],
  },
  planetImage: {
    borderColor: color.border.default,
    borderWidth: StyleSheet.hairlineWidth,
  },
  planetImageSelected: {
    borderColor: color.border.strong,
  },
  planetMood: {
    color: color.text.tertiary,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
    textAlign: 'center',
  },
  planetTitle: {
    color: color.text.primary,
    fontFamily: type.bodyMd.family,
    fontSize: type.bodyMd.size,
    fontWeight: type.bodyMd.weight,
    lineHeight: type.bodyMd.lineHeight,
    textAlign: 'center',
  },
  planLabel: {
    color: color.text.tertiary,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
  },
  planRow: {
    alignItems: 'center',
    borderBottomColor: color.border.subtle,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: space.sm,
  },
  planStack: {
    gap: space.sm,
  },
  planValue: {
    color: color.text.primary,
    fontFamily: type.bodyMd.family,
    fontSize: type.bodyMd.size,
    fontWeight: type.bodyMd.weight,
    lineHeight: type.bodyMd.lineHeight,
    textAlign: 'right',
  },
  pressed: {
    opacity: 0.85,
  },
  recommendedLabel: {
    color: color.brand.accent,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    lineHeight: type.caption.lineHeight,
    textAlign: 'center',
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
  statusDot: {
    backgroundColor: color.text.disabled,
    borderRadius: radius.pill,
    height: space.md,
    width: space.md,
  },
  statusDotOn: {
    backgroundColor: color.state.success,
  },
  statusMetaStack: {
    alignItems: 'flex-end',
    flexShrink: 0,
    gap: space.xs,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
  },
  title: {
    color: color.text.primary,
    fontFamily: type.h1.family,
    fontSize: type.h1.size,
    fontWeight: type.h1.weight,
    lineHeight: type.h1.lineHeight,
  },
});
