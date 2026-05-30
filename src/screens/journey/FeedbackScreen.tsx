import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, TextInput, Toast } from '@/components/ui';
import { noosTelemetry } from '@/lib/telemetry';
import type { JourneyStackParamList } from '@/navigation/JourneyStack';
import { feedbackMock } from '@/screens/journey/feedbackMock';
import { buildFeedbackPayload } from '@/screens/journey/feedbackPayload';
import { useSessionStore } from '@/stores/sessionStore';
import { color, motion, radius, space, type } from '@/theme';

type FeedbackProps = NativeStackScreenProps<JourneyStackParamList, 'Journey/Feedback'>;
type FeedbackSliderKey = 'musicFit' | 'focusResult';

const sliderSteps = [0, 0.25, 0.5, 0.75, 1] as const;
const sliderLabels: Record<FeedbackSliderKey, string> = {
  focusResult: '집중에 도움됐나요?',
  musicFit: '음악이 잘 맞았나요?',
};

export function FeedbackScreen({ navigation, route }: FeedbackProps) {
  const insets = useSafeAreaInsets();
  const active = useSessionStore((state) => state.active);
  const clearActive = useSessionStore((state) => state.clearActive);
  const [ratings, setRatings] = useState<Record<FeedbackSliderKey, number>>({
    focusResult: 0.5,
    musicFit: 0.5,
  });
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const activeMatchesRoute = active?.sessionId === route.params.sessionId;

  function goToday() {
    navigation.getParent()?.navigate('Today');
  }

  function finish() {
    // TODO FE-12: historyStore.upsert(completed session) when history persistence exists.
    clearActive();
    goToday();
  }

  function setSlider(key: FeedbackSliderKey, value: number) {
    setRatings((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    if (!activeMatchesRoute || submitted) {
      return;
    }

    const payload = buildFeedbackPayload({ ...ratings, memo });
    setSubmitting(true);
    setSubmitted(true);
    noosTelemetry.track('feedback_submit', {
      focusResult: payload.focusResult,
      hasMemo: payload.memo.length > 0,
      musicFit: payload.musicFit,
    });

    try {
      await feedbackMock(route.params.sessionId, payload);
      finish();
    } catch {
      // TODO FE-XX: queue failed feedback locally and retry on next app boot.
      setNotice('저장은 됐고 나중에 동기화할게요');
      setTimeout(finish, motion.duration.slower);
    } finally {
      setSubmitting(false);
    }
  }

  function skip() {
    noosTelemetry.track('feedback_skip');
    finish();
  }

  if (!activeMatchesRoute || !active) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top + space['3xl'] }]}>
        <Text style={styles.title}>남길 피드백이 없어요</Text>
        <Text style={styles.description}>완료한 세션에서 피드백을 남길 수 있어요.</Text>
        <Button label="Today로 이동" onPress={goToday} />
      </View>
    );
  }

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
      {notice ? <Toast message={notice} variant="info" /> : null}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Feedback</Text>
        <Text style={styles.title}>이번 세션은 어땠어?</Text>
        <Text style={styles.description}>짧게 남겨두면 다음 추천을 더 잘 맞출 수 있어.</Text>
      </View>

      <Card level={1} padding="lg">
        <View style={styles.sliderList}>
          {Object.entries(sliderLabels).map(([key, label]) => (
            <FeedbackSlider
              key={key}
              label={label}
              onChange={(value) => setSlider(key as FeedbackSliderKey, value)}
              value={ratings[key as FeedbackSliderKey]}
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
          label="피드백 저장"
          loading={submitting}
          disabled={submitted}
          onPress={() => void submit()}
          size="lg"
        />
        <Pressable accessibilityRole="button" disabled={submitting} onPress={skip} style={styles.skipLink}>
          <Text style={styles.skipText}>건너뛰기</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function FeedbackSlider({
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
  container: {
    backgroundColor: color.bg.base,
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
    justifyContent: 'space-between',
  },
  sliderLabel: {
    color: color.text.primary,
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
