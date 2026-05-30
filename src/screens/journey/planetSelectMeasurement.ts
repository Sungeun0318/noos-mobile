export interface MeasurementCtaState {
  body: string;
  buttonLabel: string;
  hadMeasurement: boolean;
  title: string;
}

export function formatMeasurementDate(measuredAt: string | null) {
  if (!measuredAt) {
    return '방금';
  }

  return new Date(measuredAt).toLocaleString('ko-KR', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
}

export function getMeasurementCtaState(input: {
  hasMeasurement: boolean;
  measuredAt: string | null;
  stateLabel: string | null;
}): MeasurementCtaState {
  if (!input.hasMeasurement) {
    return {
      body: '측정하면 더 정확한 추천을 받아요',
      buttonLabel: '측정하기',
      hadMeasurement: false,
      title: '기본 추천 사용 중',
    };
  }

  return {
    body: `${input.stateLabel ?? '상태 측정'} · ${formatMeasurementDate(input.measuredAt)}`,
    buttonLabel: '다시 측정',
    hadMeasurement: true,
    title: '최근 측정 사용 중',
  };
}
