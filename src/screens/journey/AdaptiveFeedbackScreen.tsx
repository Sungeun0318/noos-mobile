import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { submitAdaptiveFeedback } from '@/api/adaptiveGateway';
import { ScreenBackdrop } from '@/components/backdrop/ScreenBackdrop';
import { Button, Card, TextInput, Toast } from '@/components/ui';
import { noosTelemetry } from '@/lib/telemetry';
import type { JourneyStackParamList } from '@/navigation/JourneyStack';
import {
  adaptiveFeedbackSummaryFromPayload,
  buildAdaptiveFeedbackPayload,
  historyFromAdaptiveSession,
} from '@/screens/journey/adaptiveFeedbackPayload';
import { useAdaptiveSessionStore } from '@/stores/adaptiveSessionStore';
import { useHistoryStore } from '@/stores/historyStore';
import { color, motion, space, radius, type } from '@/theme';

type AdaptiveFeedbackProps = NativeStackScreenProps<JourneyStackParamList, 'Journey/AdaptiveFeedback'>;
type AdaptiveFeedbackKey = 'musicFit' | 'focusRelaxHelp' | 'transitionNatural';

const sliderSteps = [0, 0.25, 0.5, 0.75, 1] as const;
const sliderLabels: Record<AdaptiveFeedbackKey, string> = {
  focusRelaxHelp: '집중과 이완에 도움이 됐나요?',
  musicFit: '음악이 잘 맞았나요?',
  transitionNatural: '음악 전환이 자연스러웠나요?',
};

export function AdaptiveFeedbackScreen({ navigation, route }: AdaptiveFeedbackProps) {
  const insets = useSafeAreaInsets();
  const session = useAdaptiveSessionStore((state) => state.session);
  const clearAdaptiveSession = useAdaptiveSessionStore((state) => state.clear);
  const upsertHistory = useHistoryStore((state) => state.upsert);
  const [ratings, setRatings] = useState<Record<AdaptiveFeedbackKey, number>>({
    focusRelaxHelp: 0.5,
    musicFit: 0.5,
    transitionNatural: 0.5,
  });
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const activeMatchesRoute = session?.sessionId === route.params.sessionId;

  function goHistory() {
    navigation.getParent()?.navigate('History');
  }

  function goToday() {
    navigation.getParent()?.navigate('Today');
  }

  function finish(payload: ReturnType<typeof buildAdaptiveFeedbackPayload>) {
    if (session) {
      upsertHistory(historyFromAdaptiveSession(session, adaptiveFeedbackSummaryFromPayload(payload)));
    }

    clearAdaptiveSession();
    goHistory();
  }

  function setSlider(key: AdaptiveFeedbackKey, value: number) {
    setRatings((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    if (!activeMatchesRoute || submitted) {
      return;
    }

    const payload = buildAdaptiveFeedbackPayload({ ...ratings, memo });
    setSubmitting(true);
    setSubmitted(true);
    noosTelemetry.track('adaptive_feedback_submit', {
      hasMemo: payload.memo.length > 0,
      musicFit: payload.musicFit,
      transitionNatural: payload.transitionNatural,
    });

    try {
      await submitAdaptiveFeedback(route.params.sessionId, payload);
      finish(payload);
    } catch {
      // TODO BE-D2: retry once adaptive feedback persistence endpoint exists.
      setNotice('로컬에 저장해 두었고 서버 동기화는 후속 단계에서 연결할게요.');
      setTimeout(() => finish(payload), motion.duration.slower);
    } finally {
      setSubmitting(false);
    }
  }

  function skip() {
    const payload = buildAdaptiveFeedbackPayload({
      focusRelaxHelp: 0.5,
      memo: '',
      musicFit: 0.5,
      skipped: true,
      transitionNatural: 0.5,
    });
    noosTelemetry.track('adaptive_feedback_skip');
    finish(payload);
  }

  if (!activeMatchesRoute || !session) {
    return (
      <ScreenBackdrop>
        <View style={[styles.empty, { paddingTop: insets.top + space['3xl'] }]}>
          <Text style={styles.title}>남길 피드백이 없어요</Text>
          <Text style={styles.description}>완료한 적응형 세션에서 피드백을 남길 수 있어요.</Text>
          <Button label="Today로 이동" onPress={goToday} />
        </View>
      </ScreenBackdrop>
    );
  }

  return (
    <ScreenBackdrop>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + space['6xl'],
            paddingTop: insets.top + space.xl,
          },
        ]}
      >
        {notice ? <Toast message={notice} variant="info" /> : null}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>적응형 피드백</Text>
          <Text style={styles.title}>적응형 세션은 어땠나요?</Text>
          <Text style={styles.description}>
            짧게 남겨두면 다음 적응형 세션의 목표와 전환 판단을 개선하는 데 사용할 수 있어요.
          </Text>
        </View>

        <Card level={2} padding="lg" variant="glass">
          <View style={styles.sliderList}>
            {Object.entries(sliderLabels).map(([key, label]) => (
              <AdaptiveFeedbackSlider
                key={key}
                label={label}
                onChange={(value) => setSlider(key as AdaptiveFeedbackKey, value)}
                value={ratings[key as AdaptiveFeedbackKey]}
              />
            ))}
          </View>
        </Card>

        <TextInput
          label="한 줄 메모"
          maxLength={160}
          multiline
          onChangeText={setMemo}
          placeholder="선택 사항"
          value={memo}
        />

        <View style={styles.actions}>
          <Button
            fullWidth
            disabled={submitted}
            label="피드백 저장"
            loading={submitting}
            onPress={() => void submit()}
            size="lg"
          />
          <Pressable accessibilityRole="button" disabled={submitting} onPress={skip} style={styles.skipLink}>
            <Text style={styles.skipText}>건너뛰기</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenBackdrop>
  );
}

function AdaptiveFeedbackSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{Math.round(value * 100)}%</Text>
      </View>
      <View style={styles.sliderTrack}>
        {sliderSteps.map((step) => {
          const selected = step <= value;

          return (
            <Pressable
              accessibilityRole="adjustable"
              key={step}
              onPress={() => onChange(step)}
              style={[styles.sliderStep, selected && styles.sliderStepSelected]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: space.md,
  },
  content: {
    gap: space.xl,
    paddingHorizontal: space.xl,
  },
  description: {
    color: color.text.secondary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
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
  skipLink: {
    alignItems: 'center',
    paddingVertical: space.sm,
  },
  skipText: {
    color: color.text.tertiary,
    fontFamily: type.bodyMd.family,
    fontSize: type.bodyMd.size,
    fontWeight: type.bodyMd.weight,
    lineHeight: type.bodyMd.lineHeight,
  },
  sliderBlock: {
    gap: space.sm,
  },
  sliderHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  sliderLabel: {
    color: color.text.primary,
    flex: 1,
    fontFamily: type.bodyMd.family,
    fontSize: type.bodyMd.size,
    fontWeight: type.bodyMd.weight,
    lineHeight: type.bodyMd.lineHeight,
  },
  sliderList: {
    gap: space.xl,
  },
  sliderStep: {
    backgroundColor: color.bg.elevated,
    borderColor: color.border.default,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    height: space.lg,
  },
  sliderStepSelected: {
    backgroundColor: color.brand.accent,
  },
  sliderTrack: {
    flexDirection: 'row',
    gap: space.sm,
  },
  sliderValue: {
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
});
