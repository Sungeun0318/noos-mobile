import { describe, expect, it } from 'vitest';

import { getMeasurementCtaState } from '@/screens/journey/planetSelectMeasurement';

describe('planetSelectMeasurement', () => {
  it('shows measurement prompt when no state exists', () => {
    expect(
      getMeasurementCtaState({
        hasMeasurement: false,
        measuredAt: null,
        stateLabel: null,
      }),
    ).toEqual({
      body: '측정하면 더 정확한 추천을 받아요',
      buttonLabel: '측정하기',
      hadMeasurement: false,
      title: '기본 추천 사용 중',
    });
  });

  it('shows recent measurement metadata when state exists', () => {
    const cta = getMeasurementCtaState({
      hasMeasurement: true,
      measuredAt: '2026-05-31T01:00:00.000Z',
      stateLabel: 'calm focus',
    });

    expect(cta.buttonLabel).toBe('다시 측정');
    expect(cta.hadMeasurement).toBe(true);
    expect(cta.title).toBe('최근 측정 사용 중');
    expect(cta.body).toContain('calm focus');
  });
});
