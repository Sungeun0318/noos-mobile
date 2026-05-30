import { describe, expect, it } from 'vitest';

import { getSessionRefetchInterval } from '@/queries/usePollSession';

describe('getSessionRefetchInterval', () => {
  const now = 1_700_000_000_000;

  it('uses five second polling before the first minute', () => {
    expect(
      getSessionRefetchInterval(
        { createdAt: new Date(now - 30_000).toISOString(), status: 'queued' },
        now,
      ),
    ).toBe(5_000);
  });

  it('backs off to fifteen seconds before five minutes', () => {
    expect(
      getSessionRefetchInterval(
        { createdAt: new Date(now - 120_000).toISOString(), status: 'generating' },
        now,
      ),
    ).toBe(15_000);
  });

  it('backs off to sixty seconds after five minutes', () => {
    expect(
      getSessionRefetchInterval(
        { createdAt: new Date(now - 360_000).toISOString(), status: 'generating' },
        now,
      ),
    ).toBe(60_000);
  });

  it('stops polling for terminal statuses', () => {
    expect(getSessionRefetchInterval({ createdAt: new Date(now).toISOString(), status: 'ready' }, now)).toBe(
      false,
    );
    expect(getSessionRefetchInterval({ createdAt: new Date(now).toISOString(), status: 'failed' }, now)).toBe(
      false,
    );
    expect(
      getSessionRefetchInterval({ createdAt: new Date(now).toISOString(), status: 'completed' }, now),
    ).toBe(false);
  });
});
