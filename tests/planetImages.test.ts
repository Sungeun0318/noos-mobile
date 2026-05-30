import { describe, expect, it } from 'vitest';

import { PLANETS } from '@/theme';
import { PLANET_IMAGES } from '@/theme/planetImages';

describe('PLANET_IMAGES', () => {
  it('has one image for every planet id', () => {
    expect(Object.keys(PLANET_IMAGES).sort()).toEqual(Object.keys(PLANETS).sort());
  });

  it('has non-empty image sources', () => {
    Object.values(PLANET_IMAGES).forEach((source) => {
      expect(source).toBeTruthy();
    });
  });
});
