import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, TextInput, Toast } from '@/components/ui';
import type { MeasureStackParamList } from '@/navigation/MeasureStack';
import { noosTelemetry } from '@/lib/telemetry';
import { shouldUseMuseMeasure } from '@/screens/measure/manualStateLogic';
import { measureMock } from '@/screens/measure/measureMock';
import { useDeviceStore } from '@/stores/deviceStore';
import { useStateStore } from '@/stores/stateStore';
import { color, radius, space, type } from '@/theme';

type MeasureNavigation = NativeStackNavigationProp<MeasureStackParamList, 'Measure/Manual'>;
type SliderKey = 'focus' | 'stress' | 'fatigue' | 'relaxation';

const sliderSteps = [0, 0.25, 0.5, 0.75, 1] as const;
const sliderLabels: Record<SliderKey, string> = {
  focus: '집중 가능성',
  stress: '스트레스',
  fatigue: '피로',
  relaxation: '이완 수준',
};

export function ManualStateScreen() {
  const navigation = useNavigation<MeasureNavigation>();
  const museStatus = useDeviceStore((state) => state.muse.status);
  const setSurveyDraft = useStateStore((state) => state.setSurveyDraft);
  const setFromMeasure = useStateStore((state) => state.setFromMeasure);
  const [survey, setSurvey] = useState<Record<SliderKey, number>>({
    focus: 0.5,
    stress: 0.5,
    fatigue: 0.5,
    relaxation: 0.5,
  });
  const [intentText, setIntentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setSlider(key: SliderKey, value: number) {
    setSurvey((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    const nextSurvey = {
      ...survey,
      intentText: intentText.trim() || null,
    };

    const withEeg = shouldUseMuseMeasure(museStatus);
    setSubmitting(true);
    setError(null);
    noosTelemetry.track('manual_state_submit', {
      focus: nextSurvey.focus,
      stress: nextSurvey.stress,
      fatigue: nextSurvey.fatigue,
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
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      {error ? <Toast message={error} variant="danger" /> : null}
      <View style={styles.header}>
        <Text style={styles.title}>지금 상태를 알려줘</Text>
        <Text style={styles.description}>값을 잘 모르겠으면 기본값 그대로 진행해도 돼.</Text>
      </View>

      <Card level={1} padding="lg">
        <View style={styles.sliderList}>
          {Object.entries(sliderLabels).map(([key, label]) => (
            <SurveySlider
              key={key}
              label={label}
              onChange={(value) => setSlider(key as SliderKey, value)}
              value={survey[key as SliderKey]}
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

      {shouldUseMuseMeasure(museStatus) ? (
        <Card level={2} padding="lg">
          <Text style={styles.description}>Muse가 연결됐어. 이어서 60초 EEG 측정으로 정확도를 높일 수 있어.</Text>
        </Card>
      ) : null}
      <Button
        fullWidth
        label={shouldUseMuseMeasure(museStatus) ? '다음' : '이 결과로 진행'}
        loading={submitting}
        onPress={submit}
        size="lg"
      />
    </ScrollView>
  );
}

function SurveySlider({
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
  header: {
    gap: space.sm,
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
