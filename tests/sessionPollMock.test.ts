import { describe, expect, it } from 'vitest';

import { sessionPollMock } from '@/screens/today/sessionPollMock';
import type { PendingSession } from '@/stores/sessionStore';

const enqueuedAt = 1_700_000_000_000;

const baseSession: PendingSession = {
  durationSec: 600,
  enqueuedAt,
  estimatedReadyInSec: 30,
  planet: 'mars',
  progress: {
    etaSec: 30,
    percent: 0,
    phase: 'queued',
  },
  sessionId: 'session-poll-test',
  status: 'queued',
};

describe('sessionPollMock', () => {
  it('returns queued before the generation window starts', async () => {
    const response = await sessionPollMock(baseSession, enqueuedAt + 1_000);

    expect(response).toMatchObject({
      audio: null,
      durationSec: 600,
      planet: 'Mars',
      progress: {
        percent: 0,
        phase: 'queued',
      },
      sessionId: 'session-poll-test',
      status: 'queued',
    });
  });

  it('transitions to generating with progress after a few seconds', async () => {
    const response = await sessionPollMock(baseSession, enqueuedAt + 15_000);

    expect(response.status).toBe('generating');
    expect(response.progress?.phase).toBe('ace_step');
    expect(response.progress?.percent).toBeGreaterThan(0);
    expect(response.progress?.etaSec).toBe(15);
  });

  it('transitions to ready with ready DTO fields', async () => {
    const response = await sessionPollMock(baseSession, enqueuedAt + 31_000);

    expect(response).toMatchObject({
      error: null,
      progress: null,
      audio: {
        audioId: 'audio_mock_session-poll-test',
        streamUrl: 'mock://audio/session-poll-test',
      },
      lighting: {
        active: false,
      },
      summary: {
        title: 'Mars Ignite',
      },
      status: 'ready',
    });
    expect(response.audio).not.toBeNull();
    expect(response.summary).not.toBeNull();
    expect(response.completedAt).not.toBeNull();
  });
});
