import { beforeEach, describe, expect, it } from 'vitest';

import type {
  AdaptiveSessionResponse,
  AdaptiveWindowSubmitRequest,
  AdaptiveWindowSubmitResponse,
} from '@/api/adaptiveTypes';
import { useAdaptiveSessionStore } from '@/stores/adaptiveSessionStore';

function fullSession(status: AdaptiveSessionResponse['segments'][number]['status']): AdaptiveSessionResponse {
  return {
    createdAt: '2026-06-01T00:00:00Z',
    currentPlanet: 'Mars',
    currentSegment: {
      audioId: null,
      createdAt: '2026-06-01T00:00:00Z',
      durationSec: 120,
      fallback: false,
      genReadyAt: null,
      genStartedAt: null,
      index: 0,
      planet: 'Mars',
      playedAt: null,
      segmentId: 1,
      status,
    },
    endedAt: null,
    initialPlanet: 'Mars',
    nextSegment: null,
    pausedAt: null,
    pausedReason: null,
    recentWindows: [],
    seedSource: 'eeg',
    segments: [
      {
        audioId: null,
        createdAt: '2026-06-01T00:00:00Z',
        durationSec: 120,
        fallback: false,
        genReadyAt: null,
        genStartedAt: null,
        index: 0,
        planet: 'Mars',
        playedAt: null,
        segmentId: 1,
        status,
      },
    ],
    sessionId: 'adaptive_1',
    startedAt: '2026-06-01T00:00:00Z',
    status: 'active',
  };
}

const submittedWindow: AdaptiveWindowSubmitRequest = {
  bands: {
    alpha: 0.6,
    beta: 0.3,
    delta: 0.1,
    gamma: 0.2,
    theta: 0.5,
  },
  dominantBand: 'alpha',
  qualityScore: 0.9,
  sampleCount: 76800,
  sampleRateHz: 256,
  signalOk: true,
  windowDurationSec: 300,
  windowIndex: 2,
  windowStartAt: '2026-06-01T00:05:00Z',
};

const crossfadeResponse: AdaptiveWindowSubmitResponse = {
  adaptiveAction: {
    label: '다음 구간으로 전환',
    reason: 'state_shift_detected',
    type: 'crossfade',
    volumeScale: 1,
  },
  nextSegment: {
    id: 2,
    index: 1,
    status: 'pending',
  },
  sixAxis: {
    corticalArousal: 0.45,
    fatigueRisk: 0.1,
    focusReadiness: 0.6,
    mentalWorkload: 0.3,
    relaxationLevel: 0.5,
    stressLoad: 0.2,
  },
  windowId: 10,
};

describe('adaptiveSessionStore', () => {
  beforeEach(() => {
    useAdaptiveSessionStore.getState().clear();
  });

  it('applies start response as a seed pending session', () => {
    useAdaptiveSessionStore.getState().applyStartResponse(
      {
        seedSegment: {
          index: 0,
          segmentId: 1,
          status: 'pending',
        },
        sessionId: 'adaptive_start',
        status: 'active',
      },
      {
        planetHint: 'Mars',
        seedSource: 'eeg',
        startedAt: '2026-06-01T00:00:00Z',
      },
    );

    const state = useAdaptiveSessionStore.getState();

    expect(state.session?.sessionId).toBe('adaptive_start');
    expect(state.segments).toHaveLength(1);
    expect(state.currentSegmentIndex).toBe(0);
    expect(state.nextGenStatus).toBe('pending');
    expect(state.wearStatus).toBe('unknown');
  });

  it('applies get response and derives generation status', () => {
    const session = fullSession('generating');

    useAdaptiveSessionStore.getState().applyGetResponse({
      ...session,
      nextSegment: session.segments[0],
    });

    const state = useAdaptiveSessionStore.getState();

    expect(state.session?.sessionId).toBe('adaptive_1');
    expect(state.nextGenStatus).toBe('generating');
    expect(state.currentSegmentIndex).toBe(0);
  });

  it('applies window result with action and next segment', () => {
    useAdaptiveSessionStore.getState().applyGetResponse(fullSession('ready'));
    useAdaptiveSessionStore.getState().applyWindowResult(crossfadeResponse, submittedWindow);

    const state = useAdaptiveSessionStore.getState();

    expect(state.lastAction?.type).toBe('crossfade');
    expect(state.segments.map((segment) => segment.segmentId)).toEqual([1, 2]);
    expect(state.recentWindows[0]?.windowId).toBe(10);
    expect(state.nextGenStatus).toBe('pending');
  });

  it('sets wear status without changing session data', () => {
    useAdaptiveSessionStore.getState().applyGetResponse(fullSession('ready'));
    useAdaptiveSessionStore.getState().setWearStatus('off');

    const state = useAdaptiveSessionStore.getState();

    expect(state.wearStatus).toBe('off');
    expect(state.session?.sessionId).toBe('adaptive_1');
  });

  it('clears adaptive state', () => {
    useAdaptiveSessionStore.getState().applyGetResponse(fullSession('ready'));
    useAdaptiveSessionStore.getState().setWearStatus('worn');
    useAdaptiveSessionStore.getState().clear();

    expect(useAdaptiveSessionStore.getState()).toMatchObject({
      nextGenStatus: 'idle',
      session: null,
      wearStatus: 'unknown',
    });
  });
});
