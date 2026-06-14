import { describe, expect, it } from 'vitest';

import type { AdaptiveSessionResponse } from '@/api/adaptiveTypes';
import {
  adaptiveFeedbackSummaryFromPayload,
  buildAdaptiveFeedbackPayload,
  historyFromAdaptiveSession,
} from '@/screens/journey/adaptiveFeedbackPayload';

function adaptiveSession(): AdaptiveSessionResponse {
  return {
    createdAt: '2026-06-01T00:00:00Z',
    currentPlanet: 'Mars',
    currentSegment: null,
    endedAt: '2026-06-01T00:12:00Z',
    initialPlanet: 'Mars',
    nextSegment: null,
    pausedAt: null,
    pausedReason: null,
    recentWindows: [
      {
        adaptiveAction: 'crossfade',
        bands: {
          alpha: 0.5,
          beta: 0.4,
          delta: 0.1,
          gamma: 0.2,
          theta: 0.3,
        },
        createdAt: '2026-06-01T00:10:00Z',
        currentState: null,
        dominantBand: 'alpha',
        durationSec: 300,
        index: 1,
        qualityScore: 0.8,
        sampleCount: 76800,
        sampleRateHz: 256,
        signalOk: true,
        stateLabel: '다음 구간으로 전환',
        windowEndAt: '2026-06-01T00:10:00Z',
        windowId: 2,
        windowStartAt: '2026-06-01T00:05:00Z',
      },
    ],
    seedSource: 'eeg',
    segments: [
      {
        audioId: 'audio_seed',
        createdAt: '2026-06-01T00:00:00Z',
        durationSec: 120,
        fallback: false,
        genReadyAt: '2026-06-01T00:02:00Z',
        genStartedAt: '2026-06-01T00:00:10Z',
        index: 0,
        planet: 'Mars',
        playedAt: null,
        segmentId: 1,
        status: 'ready',
      },
      {
        audioId: 'audio_next',
        createdAt: '2026-06-01T00:05:00Z',
        durationSec: 120,
        fallback: false,
        genReadyAt: '2026-06-01T00:07:00Z',
        genStartedAt: '2026-06-01T00:05:10Z',
        index: 1,
        planet: 'Mars',
        playedAt: null,
        segmentId: 2,
        status: 'ready',
      },
    ],
    sessionId: 'adaptive_1',
    startedAt: '2026-06-01T00:00:00Z',
    status: 'ended',
  };
}

describe('adaptiveFeedbackPayload', () => {
  it('builds payload with trimmed memo and clamped ratings', () => {
    expect(
      buildAdaptiveFeedbackPayload({
        focusRelaxHelp: 1.2,
        memo: '  집중이 잘 됐어요  ',
        musicFit: -1,
        transitionNatural: 0.75,
      }),
    ).toEqual({
      focusRelaxHelp: 1,
      memo: '집중이 잘 됐어요',
      musicFit: 0,
      skipped: false,
      transitionNatural: 0.75,
    });
  });

  it('maps submitted payload to local history feedback summary', () => {
    const payload = buildAdaptiveFeedbackPayload({
      focusRelaxHelp: 0.75,
      memo: 'dummy memo',
      musicFit: 0.8,
      transitionNatural: 0.6,
    });

    expect(adaptiveFeedbackSummaryFromPayload(payload)).toEqual({
      focusResult: 0.75,
      memo: 'dummy memo',
      musicFit: 0.8,
      transitionNatural: 0.6,
    });
  });

  it('keeps skipped session history but omits feedback summary', () => {
    const payload = buildAdaptiveFeedbackPayload({
      focusRelaxHelp: 0.5,
      memo: '',
      musicFit: 0.5,
      skipped: true,
      transitionNatural: 0.5,
    });
    const history = historyFromAdaptiveSession(
      adaptiveSession(),
      adaptiveFeedbackSummaryFromPayload(payload),
      '2026-06-01T00:20:00Z',
      'simEeg',
    );

    expect(history).toMatchObject({
      audio: {
        audioId: 'audio_next',
        durationSec: 120,
      },
      adaptiveMode: 'simEeg',
      completedAt: '2026-06-01T00:12:00Z',
      durationSec: 240,
      feedbackSummary: null,
      kind: 'adaptive',
      planet: 'mars',
      sessionId: 'adaptive_1',
      stateLabel: '다음 구간으로 전환',
    });
  });
});
