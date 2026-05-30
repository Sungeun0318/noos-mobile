import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-community/netinfo', () => ({
  default: {
    addEventListener: vi.fn(() => vi.fn()),
  },
}));

import { shouldShowOfflineBanner } from '@/lib/netinfo';

describe('netinfo helpers', () => {
  it('waits for the offline grace period', () => {
    expect(shouldShowOfflineBanner('offline', 1000, 5999)).toBe(false);
    expect(shouldShowOfflineBanner('offline', 1000, 6000)).toBe(true);
  });

  it('does not show while online or unknown', () => {
    expect(shouldShowOfflineBanner('online', null, 6000)).toBe(false);
    expect(shouldShowOfflineBanner('unknown', null, 6000)).toBe(false);
  });
});
