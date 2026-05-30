import { describe, expect, it } from 'vitest';

import {
  STATE_SURVEY_SECTIONS,
  STATE_SURVEY_TOTAL_ITEMS,
  buildCanonicalState,
  countAnswered,
  createInitialAnswers,
  surveyToMeasureSurvey,
  type StateSurveyAnswers,
} from '@/screens/measure/stateSurvey';

function fillAnswers(valueByKey: Partial<StateSurveyAnswers>): StateSurveyAnswers {
  return { ...createInitialAnswers(), ...valueByKey };
}

function expectClose(actual: number, expected: number) {
  expect(actual).toBeCloseTo(expected, 5);
}

describe('stateSurvey', () => {
  it('defines 6 sections and 19 total questions', () => {
    expect(STATE_SURVEY_SECTIONS).toHaveLength(6);
    expect(STATE_SURVEY_TOTAL_ITEMS).toBe(19);
  });

  it('creates null initial answers and counts completed answers', () => {
    const answers = createInitialAnswers();

    expect(countAnswered(answers)).toBe(0);

    answers.attn_alert = 3;
    answers.kss_sleepiness = 5;

    expect(countAnswered(answers)).toBe(2);
  });

  it('uses web fallback values for unanswered middle state', () => {
    const canonical = buildCanonicalState(createInitialAnswers());

    expectClose(canonical.focus_readiness, 0.5);
    expectClose(canonical.stress_load, 0.5);
    expectClose(canonical.fatigue_risk, 0.5);
    expectClose(canonical.relaxation_level, 0.5);
    expectClose(canonical.cortical_arousal, 0.5);
    expectClose(canonical.mental_workload, 0.5);
  });

  it('matches the web canonical scoring for a high-stress profile', () => {
    const answers = fillAnswers({
      stai_calm: 1,
      stai_content: 1,
      stai_relaxed: 1,
      stai_tense: 4,
      stai_upset: 4,
      stai_worried: 4,
      serenity_at_ease: 1,
      serenity_calm: 1,
      serenity_relaxed: 1,
      mental_effort: 9,
    });
    const canonical = buildCanonicalState(answers);

    expectClose(canonical.stress_load, 1);
    expectClose(canonical.relaxation_level, 0);
    expectClose(canonical.focus_readiness, 0.325);
    expectClose(canonical.mental_workload, 0.95);
  });

  it('matches the web canonical scoring for a high-fatigue profile', () => {
    const answers = fillAnswers({
      attn_alert: 1,
      attn_attentive: 1,
      attn_concentrating: 1,
      attn_determined: 1,
      fatigue_drowsy: 5,
      fatigue_sleepy: 5,
      fatigue_sluggish: 5,
      fatigue_tired: 5,
      kss_sleepiness: 9,
    });
    const canonical = buildCanonicalState(answers);

    expectClose(canonical.fatigue_risk, 1);
    expectClose(canonical.focus_readiness, 0.175);
    expectClose(canonical.cortical_arousal, 0.075);
  });

  it('maps canonical axes into the immutable measure survey DTO', () => {
    const survey = surveyToMeasureSurvey(createInitialAnswers(), '  집중  ');

    expect(survey).toEqual({
      fatigue: 0.5,
      focus: 0.5,
      intentText: '집중',
      relaxation: 0.5,
      stress: 0.5,
    });
  });
});
