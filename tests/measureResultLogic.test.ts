import { describe, expect, it } from 'vitest';

import type { EegBands } from '@/api/types';
import {
  confidenceLabel,
  orderedRecognitionAxes,
  qualityMessage,
  recognitionLevelLabel,
  scorePercent,
  shouldShowEegBands,
} from '@/screens/measure/measureResultLogic';

const bands: EegBands = {
  alpha: 3,
  beta: 4,
  delta: 1,
  gamma: 5,
  theta: 2,
};

describe('measure result logic', () => {
  it('shows EEG bands only for eeg or hybrid sources with bands', () => {
    expect(shouldShowEegBands('eeg', bands)).toBe(true);
    expect(shouldShowEegBands('hybrid', bands)).toBe(true);
    expect(shouldShowEegBands('survey', bands)).toBe(false);
    expect(shouldShowEegBands('eeg', null)).toBe(false);
    expect(shouldShowEegBands(null, bands)).toBe(false);
  });

  it('maps recognition level and score labels for Korean UI', () => {
    expect(recognitionLevelLabel('very_low')).toBe('매우 낮음');
    expect(recognitionLevelLabel('low')).toBe('낮음');
    expect(recognitionLevelLabel('moderate')).toBe('보통');
    expect(recognitionLevelLabel('elevated')).toBe('높음');
    expect(recognitionLevelLabel('high')).toBe('매우 높음');
    expect(recognitionLevelLabel(null)).toBe('미확인');
    expect(scorePercent(0.685)).toBe(69);
    expect(scorePercent(2)).toBe(100);
    expect(confidenceLabel(0.8)).toBe('높음');
    expect(confidenceLabel(0.6)).toBe('보통');
    expect(confidenceLabel(0.2)).toBe('낮음');
  });

  it('orders recognition axes by requested section keys', () => {
    const axes = orderedRecognitionAxes(
      {
        dominantState: 'calm_focus',
        axes: [
          {
            key: 'stress_load',
            score: 0.2,
            level: 'low',
            confidence: 0.8,
            rationale: 'low stress',
          },
          {
            key: 'focus_readiness',
            score: 0.7,
            level: 'high',
            confidence: 0.9,
            rationale: 'focus support',
          },
        ],
        quality: { usable: true, score: 0.7, warnings: [] },
        bands,
      },
      ['focus_readiness', 'stress_load', 'fatigue_risk'],
    );

    expect(axes.map((axis) => axis.key)).toEqual(['focus_readiness', 'stress_load']);
  });

  it('derives quality copy from usable and score', () => {
    expect(qualityMessage(null)).toBe('신뢰도 정보가 아직 충분하지 않아요.');
    expect(
      qualityMessage({
        dominantState: null,
        axes: [],
        quality: { usable: false, score: 0.8, warnings: [] },
        bands: null,
      }),
    ).toBe('이번 해석은 참고용으로만 보는 것이 좋아요.');
    expect(
      qualityMessage({
        dominantState: null,
        axes: [],
        quality: { usable: true, score: 0.8, warnings: [] },
        bands: null,
      }),
    ).toBe('이번 측정은 비교적 안정적이에요.');
  });
});
