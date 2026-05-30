import { describe, expect, it, vi } from 'vitest';

import { feedbackMock } from '@/screens/journey/feedbackMock';
import { buildFeedbackPayload } from '@/screens/journey/feedbackPayload';

describe('feedbackMock', () => {
  it('returns the mobile feedback response shape', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-30T01:02:03.000Z'));

    const response = await feedbackMock('session-test', {
      focusResult: 0.75,
      lightingFit: 0.5,
      memo: 'dummy memo',
      musicFit: 0.8,
    });

    expect(response).toEqual({
      ok: true,
      savedAt: '2026-05-30T01:02:03.000Z',
    });

    vi.useRealTimers();
  });
});

describe('buildFeedbackPayload', () => {
  it('keeps lightingFit at the disabled-lighting default and trims memo', () => {
    expect(
      buildFeedbackPayload({
        focusResult: 0.25,
        memo: '  memo  ',
        musicFit: 1,
      }),
    ).toEqual({
      focusResult: 0.25,
      lightingFit: 0.5,
      memo: 'memo',
      musicFit: 1,
    });
  });
});
