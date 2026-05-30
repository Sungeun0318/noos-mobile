import type { CurrentState, MeasureSurvey } from '@/api/types';

export interface StateSurveyOption {
  value: number;
  label: string;
}

export interface StateSurveyQuestion {
  key: StateSurveyQuestionKey;
  label: string;
}

export interface StateSurveySection {
  id: string;
  kicker: string;
  title: string;
  description: string;
  options: StateSurveyOption[];
  questions: StateSurveyQuestion[];
}

export type StateSurveyAnswers = Record<StateSurveyQuestionKey, number | null>;

const PANAS_1_TO_5_OPTIONS = [
  { value: 1, label: '전혀 아니다' },
  { value: 2, label: '조금 그렇다' },
  { value: 3, label: '보통이다' },
  { value: 4, label: '꽤 그렇다' },
  { value: 5, label: '매우 그렇다' },
] as const;

const STAI_1_TO_4_OPTIONS = [
  { value: 1, label: '전혀 아니다' },
  { value: 2, label: '약간 그렇다' },
  { value: 3, label: '상당히 그렇다' },
  { value: 4, label: '매우 그렇다' },
] as const;

const KSS_1_TO_9_OPTIONS = [
  { value: 1, label: '매우 또렷함' },
  { value: 2, label: '또렷함' },
  { value: 3, label: '약간 또렷함' },
  { value: 4, label: '보통' },
  { value: 5, label: '약간 졸림' },
  { value: 6, label: '졸림' },
  { value: 7, label: '매우 졸림' },
  { value: 8, label: '몹시 졸림' },
  { value: 9, label: '잠들기 직전' },
] as const;

const MENTAL_EFFORT_1_TO_9_OPTIONS = [
  { value: 1, label: '매우 매우 낮음' },
  { value: 2, label: '매우 낮음' },
  { value: 3, label: '낮음' },
  { value: 4, label: '약간 낮음' },
  { value: 5, label: '보통' },
  { value: 6, label: '약간 높음' },
  { value: 7, label: '높음' },
  { value: 8, label: '매우 높음' },
  { value: 9, label: '매우 매우 높음' },
] as const;

const ATTENTIVENESS_ITEMS = [
  { key: 'attn_alert', label: '지금 이 순간, 나는 또렷하게 깨어 있다.' },
  { key: 'attn_attentive', label: '지금 이 순간, 나는 주의가 잘 모인다.' },
  { key: 'attn_concentrating', label: '지금 이 순간, 나는 집중 상태에 들어갈 준비가 되어 있다.' },
  { key: 'attn_determined', label: '지금 이 순간, 나는 할 일을 붙잡고 밀어갈 수 있을 것 같다.' },
] as const;

const SERENITY_ITEMS = [
  { key: 'serenity_calm', label: '지금 이 순간, 나는 차분하다.' },
  { key: 'serenity_relaxed', label: '지금 이 순간, 나는 몸과 마음이 이완되어 있다.' },
  { key: 'serenity_at_ease', label: '지금 이 순간, 나는 편안하다.' },
] as const;

const STAI6_ITEMS = [
  { key: 'stai_calm', label: '지금 이 순간, 나는 차분하다.', reverseScored: true },
  { key: 'stai_tense', label: '지금 이 순간, 나는 긴장되어 있다.', reverseScored: false },
  { key: 'stai_upset', label: '지금 이 순간, 나는 마음이 흔들리거나 불편하다.', reverseScored: false },
  { key: 'stai_relaxed', label: '지금 이 순간, 나는 편안하게 풀려 있다.', reverseScored: true },
  { key: 'stai_content', label: '지금 이 순간, 나는 만족스럽고 안정적이다.', reverseScored: true },
  { key: 'stai_worried', label: '지금 이 순간, 나는 걱정이 많다.', reverseScored: false },
] as const;

const FATIGUE_ITEMS = [
  { key: 'fatigue_sleepy', label: '지금 이 순간, 나는 졸리다.' },
  { key: 'fatigue_tired', label: '지금 이 순간, 나는 피곤하다.' },
  { key: 'fatigue_sluggish', label: '지금 이 순간, 나는 머리 회전이 둔하다.' },
  { key: 'fatigue_drowsy', label: '지금 이 순간, 나는 쉽게 가라앉을 것 같다.' },
] as const;

const KSS_ITEM = [
  {
    key: 'kss_sleepiness',
    label: '지금 이 순간, 얼마나 졸리거나 각성되어 있나요?',
  },
] as const;

const MENTAL_EFFORT_ITEM = [
  {
    key: 'mental_effort',
    label: '지금 이 순간, 머리가 감당하고 있는 정신적 노력량은 어느 정도인가요?',
  },
] as const;

export type StateSurveyQuestionKey =
  | (typeof ATTENTIVENESS_ITEMS)[number]['key']
  | (typeof SERENITY_ITEMS)[number]['key']
  | (typeof STAI6_ITEMS)[number]['key']
  | (typeof FATIGUE_ITEMS)[number]['key']
  | (typeof KSS_ITEM)[number]['key']
  | (typeof MENTAL_EFFORT_ITEM)[number]['key'];

export const STATE_SURVEY_HEADER_TITLE = 'AI 상태 인식을 위한 설문을 진행합니다.';
export const STATE_SURVEY_HEADER_SUBTITLE =
  'STAI-6, PANAS-X, KSS, Paas mental effort 기반의 현재 상태 설문입니다.';
export const STATE_SURVEY_METHOD_NOTE =
  '본 결과는 STAI-6, PANAS-X 하위척도, KSS, Paas mental effort를 조합한 비의료적 상태 추정입니다.';

export const STATE_SURVEY_SECTIONS: StateSurveySection[] = [
  {
    id: 'attentiveness',
    kicker: 'PANAS-X Attentiveness (4)',
    title: '주의집중 준비도',
    description: '지금 이 순간의 주의집중과 진입 준비 상태를 선택해 주세요.',
    options: [...PANAS_1_TO_5_OPTIONS],
    questions: [...ATTENTIVENESS_ITEMS],
  },
  {
    id: 'serenity',
    kicker: 'PANAS-X Serenity (3)',
    title: '이완/안정 수준',
    description: '몸과 마음이 얼마나 차분하고 편안한지 선택해 주세요.',
    options: [...PANAS_1_TO_5_OPTIONS],
    questions: [...SERENITY_ITEMS],
  },
  {
    id: 'stai6',
    kicker: 'STAI-6 (6)',
    title: '긴장/불안 상태',
    description: '지금 이 순간의 긴장과 걱정 강도를 선택해 주세요.',
    options: [...STAI_1_TO_4_OPTIONS],
    questions: STAI6_ITEMS.map((item) => ({ key: item.key, label: item.label })),
  },
  {
    id: 'fatigue',
    kicker: 'PANAS-X Fatigue (4)',
    title: '피로/졸림 신호',
    description: '지금 느끼는 피로와 둔화 정도를 선택해 주세요.',
    options: [...PANAS_1_TO_5_OPTIONS],
    questions: [...FATIGUE_ITEMS],
  },
  {
    id: 'kss',
    kicker: 'KSS (1)',
    title: '즉시 각성 수준',
    description: '현재 졸림 정도를 가장 가까운 단계로 선택해 주세요.',
    options: [...KSS_1_TO_9_OPTIONS],
    questions: [...KSS_ITEM],
  },
  {
    id: 'mental_effort',
    kicker: 'Paas Mental Effort (1)',
    title: '주관적 정신 부하',
    description: '현재 머리가 쓰고 있는 정신적 노력량을 선택해 주세요.',
    options: [...MENTAL_EFFORT_1_TO_9_OPTIONS],
    questions: [...MENTAL_EFFORT_ITEM],
  },
];

export const STATE_SURVEY_TOTAL_ITEMS = STATE_SURVEY_SECTIONS.reduce(
  (count, section) => count + section.questions.length,
  0,
);

const STAI_REVERSE_KEYS = STAI6_ITEMS.filter((item) => item.reverseScored).map((item) => item.key);
const STAI_DIRECT_KEYS = STAI6_ITEMS.filter((item) => !item.reverseScored).map((item) => item.key);
const ATTENTION_KEYS = ATTENTIVENESS_ITEMS.map((item) => item.key);
const SERENITY_KEYS = SERENITY_ITEMS.map((item) => item.key);
const FATIGUE_KEYS = FATIGUE_ITEMS.map((item) => item.key);

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value: number | null | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeRange(score: number, min: number, max: number) {
  return clamp((score - min) / Math.max(1, max - min), 0, 1);
}

function sumKeys(answers: StateSurveyAnswers, keys: StateSurveyQuestionKey[], fallback: number) {
  return keys.reduce((sum, key) => sum + toNumber(answers[key], fallback), 0);
}

export function createInitialAnswers(): StateSurveyAnswers {
  return Object.fromEntries(
    STATE_SURVEY_SECTIONS.flatMap((section) =>
      section.questions.map((question) => [question.key, null]),
    ),
  ) as StateSurveyAnswers;
}

export function countAnswered(answers: StateSurveyAnswers) {
  return STATE_SURVEY_SECTIONS.reduce(
    (count, section) =>
      count +
      section.questions.reduce(
        (sectionCount, question) => sectionCount + (answers[question.key] !== null ? 1 : 0),
        0,
      ),
    0,
  );
}

export function buildCanonicalState(answers: StateSurveyAnswers): CurrentState {
  const attentionScore = sumKeys(answers, ATTENTION_KEYS, 3);
  const serenityScore = sumKeys(answers, SERENITY_KEYS, 3);
  const fatigueScore = sumKeys(answers, FATIGUE_KEYS, 3);
  const kssScore = toNumber(answers.kss_sleepiness, 5);
  const mentalEffortScore = toNumber(answers.mental_effort, 5);

  const staiDirect = sumKeys(answers, STAI_DIRECT_KEYS, 2);
  const staiReverse = STAI_REVERSE_KEYS.reduce(
    (sum, key) => sum + (5 - toNumber(answers[key], 2)),
    0,
  );
  const staiScore = staiDirect + staiReverse;

  const attentionNorm = normalizeRange(attentionScore, 4, 20);
  const serenityNorm = normalizeRange(serenityScore, 3, 15);
  const fatigueNorm = normalizeRange(fatigueScore, 4, 20);
  const staiNorm = normalizeRange(staiScore, 6, 24);
  const sleepinessNorm = normalizeRange(kssScore, 1, 9);
  const wakefulnessNorm = 1 - sleepinessNorm;
  const effortNorm = normalizeRange(mentalEffortScore, 1, 9);

  return {
    cortical_arousal: clamp(
      wakefulnessNorm * 0.45 +
        attentionNorm * 0.25 +
        (1 - fatigueNorm) * 0.15 +
        effortNorm * 0.15,
      0,
      1,
    ),
    fatigue_risk: clamp(
      fatigueNorm * 0.5 + sleepinessNorm * 0.35 + (1 - attentionNorm) * 0.15,
      0,
      1,
    ),
    focus_readiness: clamp(
      attentionNorm * 0.4 +
        wakefulnessNorm * 0.25 +
        serenityNorm * 0.15 +
        (1 - staiNorm) * 0.1 +
        (1 - effortNorm) * 0.1,
      0,
      1,
    ),
    mental_workload: clamp(
      effortNorm * 0.5 + staiNorm * 0.25 + (1 - serenityNorm) * 0.15 + attentionNorm * 0.1,
      0,
      1,
    ),
    relaxation_level: clamp(
      serenityNorm * 0.6 + (1 - staiNorm) * 0.25 + (1 - effortNorm) * 0.15,
      0,
      1,
    ),
    stress_load: clamp(staiNorm * 0.65 + (1 - serenityNorm) * 0.25 + effortNorm * 0.1, 0, 1),
  };
}

export function surveyToMeasureSurvey(
  answers: StateSurveyAnswers,
  intentText: string | null,
): MeasureSurvey {
  const canonicalState = buildCanonicalState(answers);

  return {
    fatigue: canonicalState.fatigue_risk,
    focus: canonicalState.focus_readiness,
    intentText: intentText?.trim() || null,
    relaxation: canonicalState.relaxation_level,
    stress: canonicalState.stress_load,
  };
}
