import { describe, expect, it } from 'vitest';

import { compareSemver, isVersionBelowMinimum } from '@/lib/version';

describe('version helpers', () => {
  it('compares semantic versions', () => {
    expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
    expect(compareSemver('1.0.1', '1.0.0')).toBe(1);
    expect(compareSemver('1.2.0', '1.10.0')).toBe(-1);
  });

  it('detects min app version failures', () => {
    expect(isVersionBelowMinimum('1.0.0', '1.0.1')).toBe(true);
    expect(isVersionBelowMinimum('1.0.0', '1.0.0')).toBe(false);
    expect(isVersionBelowMinimum('1.1.0', '1.0.9')).toBe(false);
    expect(isVersionBelowMinimum('1.0.0', '')).toBe(false);
  });
});
