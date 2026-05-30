import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EnqueueSessionRequest } from '@/api/types';
import { enqueueMock } from '@/screens/journey/enqueueMock';

const payload: EnqueueSessionRequest = {
  durationSec: 1_800,
  idempotencyKey: 'test-idempotency-key',
  intentText: 'dummy intent',
  lightingEnabled: false,
  measurementId: 'measurement-test',
  planet: 'Mars',
  source: 'survey',
  stateLabel: 'calm focus',
};

describe('enqueueMock', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the mobile sessions 202 response shape', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    const response = await enqueueMock(payload, 0);

    expect(response).toMatchObject({
      durationSec: 1_800,
      estimatedReadyInSec: 1_440,
      planet: 'Mars',
      pollAfterMs: 5_000,
      sessionId: 'session_mock_1700000000',
      status: 'queued',
    });
    expect(new Date(response.createdAt).toString()).not.toBe('Invalid Date');
  });
});
