import * as Crypto from 'expo-crypto';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createSession } from '@/api/sessionGateway';
import type { EnqueueSessionRequest } from '@/api/types';
import { PlanetImage } from '@/components/PlanetImage';
import { PlanetHero } from '@/components/PlanetHero';
import { Button, Card, Toast } from '@/components/ui';
import { ScreenBackdrop } from '@/components/backdrop/ScreenBackdrop';
import { noosTelemetry } from '@/lib/telemetry';
import type { JourneyStackParamList } from '@/navigation/JourneyStack';
import { getMeasurementCtaState } from '@/screens/journey/planetSelectMeasurement';
import { canAddPendingSession, useSessionStore } from '@/stores/sessionStore';
import { useStateStore } from '@/stores/stateStore';
import { color, PLANET_COLORS, PLANETS, radius, space, type, type PlanetId } from '@/theme';

type PlanetSelectNavigation = NativeStackNavigationProp<JourneyStackParamList, 'Journey/PlanetSelect'> & {
  getParent: () => { navigate: (screen: 'Measure' | 'Today') => void } | undefined;
};

const durationOptions = [5, 10, 30, 60] as const;
type DurationMin = (typeof durationOptions)[number];

const planetIds = Object.keys(PLANETS) as PlanetId[];

export function PlanetSelectScreen({ navigation }: { navigation: PlanetSelectNavigation }) {
  const insets = useSafeAreaInsets();
  const measurementId = useStateStore((state) => state.measurementId);
  const currentState = useStateStore((state) => state.currentState);
  const stateLabel = useStateStore((state) => state.stateLabel);
  const measuredAt = useStateStore((state) => state.measuredAt);
  const recommendedPlanet = useStateStore((state) => state.recommendedPlanet);
  const intentText = useStateStore((state) => state.intentText);
  const source = useStateStore((state) => state.source);
  const pending = useSessionStore((state) => state.pending);
  const setDraft = useSessionStore((state) => state.setDraft);
  const addPending = useSessionStore((state) => state.addPending);
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetId | null>(recommendedPlanet);
  const [durationMin, setDurationMin] = useState<DurationMin>(10);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const heroPlanet = recommendedPlanet ?? 'neptune';

  async function startGeneration() {
    const planet = selectedPlanet ?? recommendedPlanet ?? 'neptune';

    if (!canAddPendingSession(pending.length)) {
      setToast('동시에 너무 많아요. 하나가 끝난 후 다시 시도하세요.');
      return;
    }

    setSubmitting(true);
    setToast(null);

    const durationSec = durationMin * 60;
    const payload: EnqueueSessionRequest = {
      durationSec,
      idempotencyKey: Crypto.randomUUID(),
      // DEC-011: lighting is intentionally disabled until lighting integration is re-scoped.
      lightingEnabled: false,
      planet: PLANETS[planet].title,
    };

    if (currentState) {
      payload.currentState = currentState;
    }

    if (stateLabel) {
      payload.stateLabel = stateLabel;
    }

    if (intentText) {
      payload.intentText = intentText;
    }

    if (source) {
      payload.source = source;
    }

    if (measurementId && !measurementId.startsWith('mock_')) {
      payload.measurementId = measurementId;
    }
    // TODO: send measurementId when measure(Gemma) is real.

    try {
      setDraft({ durationSec, planet });
      const response = await createSession(payload);
      addPending({
        durationSec,
        enqueuedAt: Date.parse(response.createdAt),
        estimatedReadyInSec: response.estimatedReadyInSec,
        planet,
        progress: {
          etaSec: response.estimatedReadyInSec,
          percent: 0,
          phase: 'queued',
        },
        sessionId: response.sessionId,
        status: 'queued',
      });
      noosTelemetry.track('planet_select', {
        durationMin,
        isRecommended: planet === recommendedPlanet,
        planet,
      });
      // TODO FE-07: prewarm intervention once the endpoint is wired.
      if (response.sessionId) {
        navigation.navigate('Journey/PendingSession', { sessionId: response.sessionId });
      } else {
        navigation.getParent()?.navigate('Today');
      }
    } catch {
      setToast('세션 생성을 시작하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  function goMeasure() {
    const hadMeasurement = !!(measurementId || currentState);
    noosTelemetry.track('planet_remeasure_tap', { hadMeasurement });
    navigation.getParent()?.navigate('Measure');
  }

  return (
    <ScreenBackdrop planet={selectedPlanet ?? recommendedPlanet ?? undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + space['6xl'],
            paddingTop: insets.top + space.xl,
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Journey</Text>
          <Text style={styles.title}>오늘의 행성을 고르세요</Text>
        </View>

        {toast ? <Toast message={toast} variant="warning" /> : null}
        <RecommendedHero
          isRecommended={!!recommendedPlanet}
          isSelected={(selectedPlanet ?? recommendedPlanet ?? 'neptune') === heroPlanet}
          planet={heroPlanet}
          onSelect={() => setSelectedPlanet(heroPlanet)}
        />
        <MeasurementSourceCard
          measuredAt={measuredAt}
          stateLabel={stateLabel}
          hasMeasurement={!!(measurementId || currentState)}
          onPress={goMeasure}
        />
        {intentText ? <IntentChip intentText={intentText} /> : null}

        <PlanetGrid
          recommendedPlanet={recommendedPlanet}
          selectedPlanet={selectedPlanet ?? recommendedPlanet ?? null}
          onSelect={setSelectedPlanet}
        />
        <DurationPicker durationMin={durationMin} onChange={setDurationMin} />
        {durationMin === 60 ? <Toast message="긴 곡은 최대 1시간까지 걸릴 수 있어요." variant="info" /> : null}
        <LightingToggle />
        <Card level={2} padding="lg" variant="glass">
          <View style={styles.ctaStack}>
            <Text style={styles.ctaMeta}>선택한 행성으로 음악을 만들어요</Text>
            <Button
              fullWidth
              label="이 세션 만들기"
              loading={submitting}
              onPress={startGeneration}
              size="lg"
            />
          </View>
        </Card>
      </ScrollView>
    </ScreenBackdrop>
  );
}

function MeasurementSourceCard({
  hasMeasurement,
  measuredAt,
  stateLabel,
  onPress,
}: {
  hasMeasurement: boolean;
  measuredAt: string | null;
  stateLabel: string | null;
  onPress: () => void;
}) {
  const cta = getMeasurementCtaState({ hasMeasurement, measuredAt, stateLabel });

  return (
    <Card level={1} padding="md" variant="compact">
      <View style={styles.measurementRow}>
        <View style={styles.cardStack}>
          <Text style={styles.cardTitleSmall}>{cta.title}</Text>
          <Text style={styles.bodyText}>{cta.body}</Text>
        </View>
        <Button label={cta.buttonLabel} onPress={onPress} size="sm" variant="secondary" />
      </View>
    </Card>
  );
}

function RecommendedHero({
  isRecommended,
  planet,
  isSelected,
  onSelect,
}: {
  isRecommended: boolean;
  planet: PlanetId;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const meta = PLANETS[planet];

  return (
    <Pressable accessibilityRole="button" onPress={onSelect} style={({ pressed }) => pressed && styles.pressed}>
      <View style={[styles.heroShell, isSelected && styles.heroShellSelected]}>
        <PlanetHero imageSize={heroOrbSize} planet={planet}>
          <Text style={styles.label}>{isRecommended ? '추천 행성' : '기본 추천'}</Text>
          <Text style={styles.heroTitle}>{meta.title}</Text>
          <Text style={styles.bodyText}>{meta.description}</Text>
          <Text style={styles.heroMood}>{meta.moodTarget}</Text>
        </PlanetHero>
      </View>
    </Pressable>
  );
}

function PlanetGrid({
  selectedPlanet,
  recommendedPlanet,
  onSelect,
}: {
  selectedPlanet: PlanetId | null;
  recommendedPlanet: PlanetId | null;
  onSelect: (planet: PlanetId) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>행성</Text>
      <View style={styles.grid}>
        {planetIds.map((planetId) => {
          const meta = PLANETS[planetId];
          const selected = selectedPlanet === planetId;
          const recommended = recommendedPlanet === planetId;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={planetId}
              onPress={() => onSelect(planetId)}
              style={({ pressed }) => [
                styles.planetCard,
                selected && styles.planetCardSelected,
                selected && { borderColor: PLANET_COLORS[planetId].secondary },
                pressed && styles.pressed,
              ]}
            >
              {/* TODO FE-XX: animate selected scale/ring with reanimated once approved. */}
              <PlanetImage
                planet={planetId}
                round
                size={gridOrbSize}
                style={[styles.planetImage, selected && styles.planetImageSelected]}
              />
              <Text style={styles.planetTitle}>{meta.title}</Text>
              <Text style={styles.planetMood}>{meta.moodTarget}</Text>
              {recommended ? <Text style={styles.recommendedLabel}>추천</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function DurationPicker({
  durationMin,
  onChange,
}: {
  durationMin: DurationMin;
  onChange: (duration: DurationMin) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>길이</Text>
      <View style={styles.segmentRow}>
        {durationOptions.map((option) => {
          const selected = option === durationMin;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={option}
              onPress={() => onChange(option)}
              style={({ pressed }) => [
                styles.segment,
                selected && styles.segmentSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{option}분</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function LightingToggle() {
  return (
    <Card level={2} padding="lg" variant="glass">
      <View style={styles.lightingRow}>
        <View style={styles.cardStack}>
          <Text style={styles.cardTitleSmall}>조명</Text>
          <Text style={styles.bodyText}>조명 미연결</Text>
        </View>
        <View style={styles.disabledToggle}>
          <View style={styles.disabledToggleKnob} />
        </View>
      </View>
    </Card>
  );
}

function IntentChip({ intentText }: { intentText: string }) {
  return (
    <View style={styles.intentChip}>
      <Text style={styles.intentText}>{intentText}</Text>
    </View>
  );
}

const heroOrbSize = space['6xl'] + space['4xl'];
const gridOrbSize = space['4xl'];

const styles = StyleSheet.create({
  bodyText: {
    color: color.text.secondary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
  },
  cardStack: {
    flex: 1,
    gap: space.xs,
  },
  cardTitleSmall: {
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
  disabledToggle: {
    alignItems: 'flex-start',
    backgroundColor: color.bg.elevated,
    borderColor: color.border.default,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: space.xl,
    justifyContent: 'center',
    paddingHorizontal: space.xs,
    width: space['4xl'],
  },
  disabledToggleKnob: {
    backgroundColor: color.text.tertiary,
    borderRadius: radius.pill,
    height: space.md,
    width: space.md,
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
    gap: space.xs,
  },
  heroMood: {
    color: color.text.primary,
    fontFamily: type.bodyMd.family,
    fontSize: type.bodyMd.size,
    fontWeight: type.bodyMd.weight,
    lineHeight: type.bodyMd.lineHeight,
  },
  heroShell: {
    borderRadius: radius['2xl'],
  },
  heroShellSelected: {
    borderColor: color.border.strong,
    borderRadius: radius['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
  },
  heroTitle: {
    color: color.text.primary,
    fontFamily: type.display.family,
    fontSize: type.display.size,
    fontWeight: type.display.weight,
    lineHeight: type.display.lineHeight,
  },
  intentChip: {
    alignSelf: 'flex-start',
    backgroundColor: color.bg.surfaceAlt,
    borderColor: color.border.default,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  intentText: {
    color: color.text.secondary,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
  },
  label: {
    color: color.text.tertiary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    letterSpacing: 0.4,
    lineHeight: type.caption.lineHeight,
  },
  lightingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.lg,
    justifyContent: 'space-between',
  },
  measurementRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
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
    borderWidth: StyleSheet.hairlineWidth,
    transform: [{ scale: 1.03 }],
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
  pressed: {
    opacity: 0.85,
  },
  planetImage: {
    borderColor: color.border.default,
    borderWidth: StyleSheet.hairlineWidth,
  },
  planetImageSelected: {
    borderColor: color.border.strong,
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
  segment: {
    alignItems: 'center',
    backgroundColor: color.bg.glass,
    borderColor: color.border.default,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: space.md,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  segmentSelected: {
    backgroundColor: color.brand.accent,
    borderColor: color.brand.accent,
    transform: [{ scale: 1.02 }],
  },
  segmentText: {
    color: color.text.secondary,
    fontFamily: type.bodyMd.family,
    fontSize: type.bodyMd.size,
    fontWeight: type.bodyMd.weight,
    lineHeight: type.bodyMd.lineHeight,
  },
  segmentTextSelected: {
    color: color.text.inverse,
  },
  title: {
    color: color.text.primary,
    fontFamily: type.h1.family,
    fontSize: type.h1.size,
    fontWeight: type.h1.weight,
    lineHeight: type.h1.lineHeight,
  },
});
