import { describe, expect, it } from 'vitest';

import { shouldUseMuseMeasure } from '@/screens/measure/manualStateLogic';

describe('ManualState muse branch', () => {
  it('uses Muse measure only when Muse is connected', () => {
    expect(shouldUseMuseMeasure('connected')).toBe(true);
    expect(shouldUseMuseMeasure('idle')).toBe(false);
    expect(shouldUseMuseMeasure('measuring')).toBe(false);
  });
});
