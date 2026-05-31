import { describe, expect, it } from 'vitest';

import type { EegBands } from '@/api/types';
import { shouldShowEegBands } from '@/screens/measure/measureResultLogic';

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
});

