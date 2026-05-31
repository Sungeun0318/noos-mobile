import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenBackdrop } from '@/components/backdrop/ScreenBackdrop';
import { Button, Card, TextInput, Toast } from '@/components/ui';
import type { MeasureStackParamList } from '@/navigation/MeasureStack';
import { noosTelemetry } from '@/lib/telemetry';
import { shouldUseMuseMeasure } from '@/screens/measure/manualStateLogic';
import { measureMock } from '@/screens/measure/measureMock';
import {
  STATE_SURVEY_HEADER_SUBTITLE,
  STATE_SURVEY_HEADER_TITLE,
  STATE_SURVEY_METHOD_NOTE,
  STATE_SURVEY_SECTIONS,
  STATE_SURVEY_TOTAL_ITEMS,
  countAnswered,
  createInitialAnswers,
  surveyToMeasureSurvey,
  type StateSurveyAnswers,
  type StateSurveyOption,
  type StateSurveyQuestion,
  type StateSurveyQuestionKey,
} from '@/screens/measure/stateSurvey';
import { useDeviceStore } from '@/stores/deviceStore';
import { useStateStore } from '@/stores/stateStore';
import { color, radius, space, type } from '@/theme';

type MeasureNavigation = NativeStackNavigationProp<MeasureStackParamList, 'Measure/Manual'>;

export function ManualStateScreen() {
  const navigation = useNavigation<MeasureNavigation>();
  const museStatus = useDeviceStore((state) => state.muse.status);
  const setSurveyDraft = useStateStore((state) => state.setSurveyDraft);
  const setFromMeasure = useStateStore((state) => state.setFromMeasure);
  const [answers, setAnswers] = useState<StateSurveyAnswers>(() => createInitialAnswers());
  const [sectionIndex, setSectionIndex] = useState(0);
  const [intentText, setIntentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const section = STATE_SURVEY_SECTIONS[sectionIndex];
  const answeredCount = countAnswered(answers);
  const progress = answeredCount / STATE_SURVEY_TOTAL_ITEMS;
  const isLastSection = sectionIndex === STATE_SURVEY_SECTIONS.length - 1;
  const sectionComplete = section.questions.every((question) => answers[question.key] !== null);
  const withEeg = shouldUseMuseMeasure(museStatus);

  function setAnswer(key: StateSurveyQuestionKey, value: number) {
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  function goNext() {
    if (!isLastSection) {
      setSectionIndex((current) => current + 1);
    }
  }

  function goPrev() {
    setSectionIndex((current) => Math.max(0, current - 1));
  }

  async function submit() {
    const nextSurvey = surveyToMeasureSurvey(answers, intentText);

    setSubmitting(true);
    setError(null);
    noosTelemetry.track('manual_state_submit', {
      focus: nextSurvey.focus ?? 0.5,
      stress: nextSurvey.stress ?? 0.5,
      fatigue: nextSurvey.fatigue ?? 0.5,
      withEeg,
    });

    try {
      setSurveyDraft(nextSurvey);

      if (withEeg) {
        navigation.navigate('Measure/MuseMeasure');
        return;
      }

      const response = await measureMock(nextSurvey);
      setFromMeasure(response);
      navigation.navigate('Measure/Result');
    } catch {
      setError('측정 결과를 만들지 못했어요. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenBackdrop planet="earth">
      <ScrollView contentContainerStyle={styles.content}>
        {error ? <Toast message={error} variant="danger" /> : null}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Validated Survey</Text>
          <Text style={styles.title}>{STATE_SURVEY_HEADER_TITLE}</Text>
          <Text style={styles.description}>{STATE_SURVEY_HEADER_SUBTITLE}</Text>
        </View>

        <Card level={1} padding="lg" variant="glass">
          <View style={styles.progressStack}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>
                응답 완료 {answeredCount}/{STATE_SURVEY_TOTAL_ITEMS}
              </Text>
              <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <SectionProgressRail currentIndex={sectionIndex} />
          </View>
        </Card>

        <Card level={2} padding="lg" variant="hero">
          <View style={styles.sectionHeader}>
            <View style={styles.metaRow}>
              <Text style={styles.sectionKicker}>{section.kicker}</Text>
              <Text style={styles.sectionKicker}>
                섹션 {sectionIndex + 1}/{STATE_SURVEY_SECTIONS.length}
              </Text>
            </View>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.description}>{section.description}</Text>
          </View>

          <View style={styles.questionList}>
            {section.questions.map((question) => (
              <SurveyQuestion
                key={question.key}
                options={section.options}
                question={question}
                value={answers[question.key]}
                onChange={setAnswer}
              />
            ))}
          </View>
        </Card>

        <TextInput
          label="지금 어떤 상태로 가고 싶나요?"
          maxLength={120}
          multiline
          onChangeText={setIntentText}
          placeholder="예: 집중해서 코딩하고 싶어"
          value={intentText}
        />

        {withEeg ? (
          <Card level={2} padding="lg" variant="glass">
            <Text style={styles.description}>Muse가 연결되었습니다. 이어서 60초 EEG 측정으로 정확도를 높일 수 있습니다.</Text>
          </Card>
        ) : null}

        <Text style={styles.note}>{STATE_SURVEY_METHOD_NOTE}</Text>

        <View style={styles.actions}>
          <Button disabled={sectionIndex === 0 || submitting} label="이전" onPress={goPrev} variant="secondary" />
          {!isLastSection ? (
            <Button
              disabled={!sectionComplete}
              label="다음"
              onPress={goNext}
              variant="primary"
            />
          ) : (
            <Button
              disabled={!sectionComplete}
              label={withEeg ? '다음' : '이 결과로 진행'}
              loading={submitting}
              onPress={submit}
              variant="primary"
            />
          )}
        </View>
      </ScrollView>
    </ScreenBackdrop>
  );
}

function SectionProgressRail({ currentIndex }: { currentIndex: number }) {
  return (
    <View style={styles.rail}>
      {STATE_SURVEY_SECTIONS.map((section, index) => {
        const active = index === currentIndex;
        const complete = index < currentIndex;

        return (
          <View
            key={section.id}
            style={[
              styles.railItem,
              complete && styles.railItemComplete,
              active && styles.railItemActive,
            ]}
          >
            <Text
              style={[
                styles.railText,
                complete && styles.railTextComplete,
                active && styles.railTextActive,
              ]}
            >
              {index + 1}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function SurveyQuestion({
  question,
  options,
  value,
  onChange,
}: {
  question: StateSurveyQuestion;
  options: StateSurveyOption[];
  value: number | null;
  onChange: (key: StateSurveyQuestionKey, value: number) => void;
}) {
  return (
    <View style={styles.questionBlock}>
      <Text style={styles.questionText}>{question.label}</Text>
      <View style={[styles.optionGrid, options.length > 6 && styles.optionGridDense]}>
        {options.map((option) => {
          const selected = value === option.value;

          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={`${question.key}-${option.value}`}
              onPress={() => onChange(question.key, option.value)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.optionValue, selected && styles.optionTextSelected]}>
                {option.value}
              </Text>
              <Text style={[styles.optionLabel, selected && styles.optionTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    justifyContent: 'space-between',
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
    letterSpacing: 0,
    lineHeight: type.caption.lineHeight,
  },
  header: {
    gap: space.sm,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    justifyContent: 'space-between',
  },
  note: {
    color: color.text.tertiary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    lineHeight: type.caption.lineHeight,
  },
  option: {
    alignItems: 'center',
    backgroundColor: color.bg.glass,
    borderColor: color.border.default,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: space['6xl'],
    gap: space.xs,
    minHeight: space['5xl'],
    paddingHorizontal: space.xs,
    paddingVertical: space.sm,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
  },
  optionGridDense: {
    gap: space.xs,
  },
  optionLabel: {
    color: color.text.secondary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    lineHeight: type.caption.lineHeight,
    textAlign: 'center',
  },
  optionSelected: {
    backgroundColor: color.brand.accent,
    borderColor: color.brand.accent,
    transform: [{ scale: 1.02 }],
  },
  optionTextSelected: {
    color: color.text.inverse,
  },
  optionValue: {
    color: color.text.primary,
    fontFamily: type.bodyMd.family,
    fontSize: type.bodyMd.size,
    fontWeight: type.bodyMd.weight,
    lineHeight: type.bodyMd.lineHeight,
  },
  pressed: {
    opacity: 0.85,
  },
  progressFill: {
    backgroundColor: color.brand.accent,
    borderRadius: radius.pill,
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStack: {
    gap: space.md,
  },
  progressText: {
    color: color.text.secondary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    lineHeight: type.caption.lineHeight,
  },
  progressTrack: {
    backgroundColor: color.bg.elevated,
    borderRadius: radius.pill,
    height: space.sm,
    overflow: 'hidden',
  },
  questionBlock: {
    gap: space.sm,
  },
  questionList: {
    gap: space.xl,
  },
  questionText: {
    color: color.text.primary,
    fontFamily: type.bodyMd.family,
    fontSize: type.bodyMd.size,
    fontWeight: type.bodyMd.weight,
    lineHeight: type.bodyMd.lineHeight,
  },
  rail: {
    flexDirection: 'row',
    gap: space.sm,
  },
  railItem: {
    alignItems: 'center',
    backgroundColor: color.bg.surfaceAlt,
    borderColor: color.border.subtle,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    height: space['2xl'],
    justifyContent: 'center',
  },
  railItemActive: {
    backgroundColor: color.brand.accent,
    borderColor: color.brand.accent,
  },
  railItemComplete: {
    backgroundColor: color.bg.hero,
    borderColor: color.border.default,
  },
  railText: {
    color: color.text.tertiary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    lineHeight: type.caption.lineHeight,
  },
  railTextActive: {
    color: color.text.inverse,
  },
  railTextComplete: {
    color: color.text.primary,
  },
  sectionHeader: {
    gap: space.sm,
    marginBottom: space.xl,
  },
  sectionKicker: {
    color: color.text.tertiary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    lineHeight: type.caption.lineHeight,
  },
  sectionTitle: {
    color: color.text.primary,
    flexShrink: 1,
    fontFamily: type.h2.family,
    fontSize: type.h2.size,
    fontWeight: type.h2.weight,
    lineHeight: type.h2.lineHeight,
  },
  title: {
    color: color.text.primary,
    fontFamily: type.h1.family,
    fontSize: type.h1.size,
    fontWeight: type.h1.weight,
    lineHeight: type.h1.lineHeight,
  },
});
