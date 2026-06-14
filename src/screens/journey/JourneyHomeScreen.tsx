import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenBackdrop } from '@/components/backdrop/ScreenBackdrop';
import { Card } from '@/components/ui';
import { noosTelemetry } from '@/lib/telemetry';
import type { JourneyStackParamList } from '@/navigation/JourneyStack';
import { getJourneyResumeTarget } from '@/screens/journey/journeyHomeLogic';
import { useAdaptiveSessionStore } from '@/stores/adaptiveSessionStore';
import { useSessionStore } from '@/stores/sessionStore';
import { color, radius, space, type } from '@/theme';

type JourneyHomeProps = NativeStackScreenProps<JourneyStackParamList, 'Journey/Home'>;

export function JourneyHomeScreen({ navigation }: JourneyHomeProps) {
  const insets = useSafeAreaInsets();
  const adaptiveSession = useAdaptiveSessionStore((state) => state.session);
  const pendingSessions = useSessionStore((state) => state.pending);
  const promoteToActive = useSessionStore((state) => state.promoteToActive);
  const resumeTarget = useMemo(
    () => getJourneyResumeTarget(adaptiveSession, pendingSessions),
    [adaptiveSession, pendingSessions],
  );
  const hasResume = !!resumeTarget;

  useEffect(() => {
    noosTelemetry.track('journey_home_view', {
      hasResume,
    });
  }, [hasResume]);

  function openPlanetSelect() {
    noosTelemetry.track('journey_home_card_tap', { target: 'single_session' });
    navigation.navigate('Journey/PlanetSelect');
  }

  function openAdaptiveSetup() {
    noosTelemetry.track('journey_home_card_tap', { target: 'adaptive_session' });
    navigation.navigate('Journey/AdaptiveSetup');
  }

  function resumeSession() {
    if (!resumeTarget) {
      return;
    }

    noosTelemetry.track('journey_resume_tap', { type: resumeTarget.type });

    if (resumeTarget.type === 'adaptive') {
      navigation.navigate('Journey/AdaptivePlayer', { sessionId: resumeTarget.sessionId });
      return;
    }

    if (resumeTarget.ready) {
      promoteToActive(resumeTarget.sessionId);
      navigation.navigate('Journey/Player', { sessionId: resumeTarget.sessionId });
      return;
    }

    navigation.navigate('Journey/PendingSession', { sessionId: resumeTarget.sessionId });
  }

  return (
    <ScreenBackdrop planet="neptune">
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
          <Text style={styles.title}>세션을 시작하세요</Text>
          <Text style={styles.description}>
            행성을 고르는 음악 세션과 EEG를 따라 움직이는 적응형 세션 중 선택할 수 있습니다.
          </Text>
        </View>

        <JourneyCard
          body="목표 행성, 길이, 의도를 정하고 ACE-Step 음악 생성을 시작합니다."
          cta="행성 선택"
          eyebrow="Single Session"
          onPress={openPlanetSelect}
          title="음악 세션 만들기"
        />
        <JourneyCard
          body="목표 행성을 정한 뒤 Muse EEG를 따라 다음 음악을 계속 조정합니다."
          cta="적응형 설정"
          eyebrow="Adaptive"
          onPress={openAdaptiveSetup}
          title="실시간 적응형 세션"
        />
        {resumeTarget ? (
          <JourneyCard
            body={resumeTarget.description}
            cta="이어보기"
            eyebrow="Resume"
            onPress={resumeSession}
            title={resumeTarget.label}
          />
        ) : null}
      </ScrollView>
    </ScreenBackdrop>
  );
}

function JourneyCard({
  body,
  cta,
  eyebrow,
  onPress,
  title,
}: {
  body: string;
  cta: string;
  eyebrow: string;
  onPress: () => void;
  title: string;
}) {
  return (
    <Card level={2} onPress={onPress} padding="xl" variant="glass">
      <View style={styles.cardStack}>
        <View style={styles.cardHeader}>
          <View style={styles.cardCopy}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text style={styles.cardTitle}>{title}</Text>
          </View>
          <View style={styles.ctaPill}>
            <Text style={styles.ctaPillText}>{cta}</Text>
          </View>
        </View>
        <Text style={styles.description}>{body}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  cardCopy: {
    flex: 1,
    gap: space.xs,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  cardStack: {
    gap: space.md,
  },
  cardTitle: {
    color: color.text.primary,
    fontFamily: type.h2.family,
    fontSize: type.h2.size,
    fontWeight: type.h2.weight,
    lineHeight: type.h2.lineHeight,
  },
  content: {
    gap: space.lg,
    paddingHorizontal: space.xl,
  },
  ctaPill: {
    backgroundColor: color.brand.accent,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  ctaPillText: {
    color: color.text.inverse,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    lineHeight: type.caption.lineHeight,
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
  title: {
    color: color.text.primary,
    fontFamily: type.h1.family,
    fontSize: type.h1.size,
    fontWeight: type.h1.weight,
    lineHeight: type.h1.lineHeight,
  },
});
