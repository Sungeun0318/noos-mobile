import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  activeFromHistorySession,
  historyFromActiveSession,
} from '@/screens/history/historyTransforms';
import type { HistorySession } from '@/stores/historyStore';
import type { ActiveSession } from '@/stores/sessionStore';

const active: ActiveSession = {
  audio: {
    audioId: 'audio_test',
    durationSec: 600,
    streamUrl: 'mock://audio/session_test',
  },
  durationSec: 600,
  lighting: null,
  planet: 'mars',
  sessionId: 'session_test',
  startedAt: Date.parse('2026-05-20T01:50:00.000Z'),
  status: 'completed',
  summary: {
    description: 'Focused track',
    title: 'Mars Ignite',
  },
};

const currentState = {
  cortical_arousal: 0.5,
  fatigue_risk: 0.3,
  focus_readiness: 0.8,
  mental_workload: 0.4,
  relaxation_level: 0.6,
  stress_load: 0.2,
};

describe('history transforms', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a history session from active session, state snapshot, and feedback', () => {
    const history = historyFromActiveSession(
      active,
      {
        currentState,
        intentText: 'deep work',
        stateLabel: 'calm focus',
      },
      { focusResult: 0.75, musicFit: 1 },
      '2026-05-20T02:00:00.000Z',
    );

    expect(history).toMatchObject({
      audio: { audioId: 'audio_test', durationSec: 600 },
      completedAt: '2026-05-20T02:00:00.000Z',
      createdAt: '2026-05-20T01:50:00.000Z',
      currentState,
      feedbackSummary: { focusResult: 0.75, musicFit: 1 },
      intentText: 'deep work',
      planet: 'mars',
      sessionId: 'session_test',
      stateLabel: 'calm focus',
    });
  });

  it('maps history session back to active session for replay', () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-05-21T01:00:00.000Z'));
    const history: HistorySession = {
      audio: { audioId: 'audio_test', durationSec: 600 },
      completedAt: '2026-05-20T02:00:00.000Z',
      createdAt: '2026-05-20T01:50:00.000Z',
      currentState: null,
      durationSec: 600,
      feedbackSummary: null,
      intentText: null,
      planet: 'mars',
      sessionId: 'session_test',
      stateLabel: null,
      summary: { description: 'Focused track', title: 'Mars Ignite' },
    };

    expect(activeFromHistorySession(history)).toMatchObject({
      audio: {
        audioId: 'audio_test',
        durationSec: 600,
      },
      durationSec: 600,
      planet: 'mars',
      sessionId: 'session_test',
      startedAt: Date.parse('2026-05-21T01:00:00.000Z'),
      status: 'playing',
      summary: { description: 'Focused track', title: 'Mars Ignite' },
    });
  });

  it('normalizes server list items into history sessions', async () => {
    const { historyFromSessionListItem } = await import('@/screens/history/historyTransforms');

    expect(
      historyFromSessionListItem({
        audio: { audioId: 'audio_real', durationSec: 300 },
        completedAt: '2026-05-20T02:00:00.000Z',
        createdAt: '2026-05-20T01:55:00.000Z',
        durationSec: 300,
        feedbackSummary: { focusResult: 0.7, musicFit: 0.8 },
        planet: 'Mars',
        sessionId: 'session_real',
        stateLabel: 'calm focus',
      }),
    ).toMatchObject({
      audio: { audioId: 'audio_real', durationSec: 300 },
      currentState: null,
      feedbackSummary: { focusResult: 0.7, musicFit: 0.8 },
      planet: 'mars',
      sessionId: 'session_real',
      stateLabel: 'calm focus',
    });
  });

  it('normalizes server detail responses into history sessions', async () => {
    const { historyFromSessionGetResponse } = await import('@/screens/history/historyTransforms');

    expect(
      historyFromSessionGetResponse({
        audio: { audioId: 'audio_real', durationSec: 300 },
        completedAt: null,
        createdAt: '2026-05-20T01:55:00.000Z',
        currentState,
        durationSec: 300,
        error: null,
        feedbackSummary: { focusResult: 0.7, musicFit: 0.8 },
        intentText: 'focus',
        lighting: null,
        planet: 'MARS',
        progress: null,
        sessionId: 'session_real',
        startedAt: '2026-05-20T01:56:00.000Z',
        stateLabel: 'calm focus',
        status: 'ready',
        summary: { description: 'Focused track', title: 'Mars Ignite' },
      }),
    ).toMatchObject({
      completedAt: '2026-05-20T01:56:00.000Z',
      currentState,
      feedbackSummary: { focusResult: 0.7, musicFit: 0.8 },
      intentText: 'focus',
      planet: 'mars',
      summary: { title: 'Mars Ignite' },
    });
  });
});
