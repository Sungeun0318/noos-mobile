import type { CurrentState, EegBands, MeasureSource, RecognitionAxisDetail, RecognitionDetail } from '@/api/types';

export function shouldShowEegBands(source: MeasureSource | null, bands: EegBands | null) {
  return !!bands && (source === 'eeg' || source === 'hybrid');
}

export const primaryRecognitionAxes: Array<keyof CurrentState> = [
  'focus_readiness',
  'stress_load',
  'fatigue_risk',
];

export const secondaryRecognitionAxes: Array<keyof CurrentState> = [
  'mental_workload',
  'relaxation_level',
  'cortical_arousal',
];

export const recognitionAxisLabels: Record<keyof CurrentState, string> = {
  focus_readiness: '집중 준비도',
  stress_load: '스트레스 부하',
  fatigue_risk: '피로 위험',
  relaxation_level: '이완 수준',
  cortical_arousal: '각성 수준',
  mental_workload: '인지 작업부하',
};

const levelLabels: Record<string, string> = {
  very_low: '매우 낮음',
  low: '낮음',
  moderate: '보통',
  medium: '보통',
  elevated: '높음',
  high: '매우 높음',
};

export function recognitionLevelLabel(level: string | null | undefined) {
  if (!level) {
    return '미확인';
  }

  return levelLabels[level] ?? level;
}

export function scorePercent(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }

  return Math.round(Math.min(1, Math.max(0, value)) * 100);
}

export function confidenceLabel(value: number | null | undefined) {
  const percent = scorePercent(value);

  if (percent >= 75) {
    return '높음';
  }
  if (percent >= 50) {
    return '보통';
  }
  return '낮음';
}

export function qualityMessage(recognition: RecognitionDetail | null | undefined) {
  if (!recognition?.quality) {
    return '신뢰도 정보가 아직 충분하지 않아요.';
  }

  const score = recognition.quality.score;
  if (!recognition.quality.usable) {
    return '이번 해석은 참고용으로만 보는 것이 좋아요.';
  }
  if (score >= 0.75) {
    return '이번 측정은 비교적 안정적이에요.';
  }
  if (score >= 0.5) {
    return '해석 가능하지만 일부 노이즈 가능성이 있어요.';
  }
  return '참고용 해석으로 보는 것이 좋아요.';
}

export function orderedRecognitionAxes(
  recognition: RecognitionDetail | null | undefined,
  keys: Array<keyof CurrentState>,
) {
  if (!recognition) {
    return [];
  }

  return keys
    .map((key) => recognition.axes.find((axis) => axis.key === key))
    .filter((axis): axis is RecognitionAxisDetail => !!axis);
}
