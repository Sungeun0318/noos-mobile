import { beforeEach, describe, expect, it } from 'vitest';

import {
  __resetAdaptiveMock,
  getAdaptiveSessionMock,
  startAdaptiveSessionMock,
  submitAdaptiveWindowMock,
} from '@/api/adaptiveMock';
import type { AdaptiveWindowSubmitRequest } from '@/api/adaptiveTypes';

const t0 = Date.parse('2026-06-01T00:00:00Z');

const windowPayload: AdaptiveWindowSubmitRequest = {
  bands: {
    alpha: 0.7,
    beta: 0.35,
    delta: 0.1,
    gamma: 0.2,
    theta: 0.45,
  },
  dominantBand: 'alpha',
  qualityScore: 0.85,
  sampleCount: 76800,
  sampleRateHz: 256,
  signalOk: true,
  windowDurationSec: 300,
  windowIndex: 2,
  windowStartAt: '2026-06-01T00:05:00Z',
};

describe('adaptiveMock', () => {
  beforeEach(() => {
    __resetAdaptiveMock();
  });

  it('starts a seed pending session with backend-shaped response', async () => {
    const response = await startAdaptiveSessionMock(
      {
        planetHint: 'Venus',
        seedSource: 'eeg',
      },
      t0,
    );

    expect(response).toMatchObject({
      seedSegment: {
        index: 0,
        status: 'pending',
      },
      status: 'active',
    });
    expect(typeof response.seedSegment.segmentId).toBe('number');
  });

  it('transitions seed segment from pending to generating to ready by elapsed time', async () => {
    const started = await startAdaptiveSessionMock({ planetHint: 'Mars', seedSource: 'none' }, t0);

    await expect(getAdaptiveSessionMock(started.sessionId, t0)).resolves.toMatchObject({
      nextSegment: {
        status: 'pending',
      },
    });
    await expect(getAdaptiveSessionMock(started.sessionId, t0 + 1_500)).resolves.toMatchObject({
      nextSegment: {
        status: 'generating',
      },
    });
    await expect(getAdaptiveSessionMock(started.sessionId, t0 + 5_000)).resolves.toMatchObject({
      currentSegment: {
        audioId: expect.stringContaining('audio_adaptive_mock_'),
        status: 'ready',
      },
      nextSegment: null,
    });
  });

  it('returns adaptive action and creates next segment for crossfade windows', async () => {
    const started = await startAdaptiveSessionMock({ planetHint: 'Saturn', seedSource: 'eeg' }, t0);

    const response = await submitAdaptiveWindowMock(started.sessionId, windowPayload);
    const session = await getAdaptiveSessionMock(started.sessionId, t0);

    expect(response).toMatchObject({
      adaptiveAction: {
        type: 'crossfade',
      },
      nextSegment: {
        index: 1,
        status: 'pending',
      },
    });
    expect(session.recentWindows[0]).toMatchObject({
      adaptiveAction: 'crossfade',
      windowId: response.windowId,
    });
  });
});
