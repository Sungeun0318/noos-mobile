import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdaptiveSessionResponse, AdaptiveWindowSubmitResponse } from '@/api/adaptiveTypes';
import type { MeasureEeg } from '@/api/types';
import {
  buildAdaptiveWindowRequest,
  createAdaptiveCaptureLoop,
} from '@/adaptive/adaptiveCaptureEngine';
import type { MuseMeasureTick } from '@/screens/measure/museSimulator';
import { useAdaptiveSessionStore } from '@/stores/adaptiveSessionStore';

function activeSession(sessionId = 'adaptive_loop'): AdaptiveSessionResponse {
  return {
    createdAt: '2026-06-01T00:00:00Z',
    currentPlanet: 'Mars',
    currentSegment: null,
    endedAt: null,
    initialPlanet: 'Mars',
    nextSegment: null,
    pausedAt: null,
    pausedReason: null,
    recentWindows: [],
    seedSource: 'eeg',
    segments: [],
    sessionId,
    startedAt: '2026-06-01T00:00:00Z',
    status: 'active',
  };
}

function eeg(signalQuality: number): MeasureEeg {
  return {
    bands: {
      alpha: 0.7,
      beta: 0.3,
      delta: 0.1,
      gamma: 0.2,
      theta: 0.4,
    },
    deviceId: 'muse-test',
    deviceType: 'Muse S',
    measuredAt: '2026-06-01T00:05:00Z',
    measurementDurationSec: 300,
    sampleCount: 76800,
    sampleRateHz: 256,
    signalQuality,
  };
}

function response(windowId: number): AdaptiveWindowSubmitResponse {
  return {
    adaptiveAction: {
      label: '유지',
      reason: 'stable',
      type: 'none',
      volumeScale: 1,
    },
    nextSegment: null,
    sixAxis: {
      corticalArousal: 0.45,
      fatigueRisk: 0.2,
      focusReadiness: 0.7,
      mentalWorkload: 0.3,
      relaxationLevel: 0.4,
      stressLoad: 0.2,
    },
    windowId,
  };
}

describe('adaptiveCaptureEngine', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    useAdaptiveSessionStore.getState().clear();
  });

  it('builds submitWindow request from Muse EEG', () => {
    const request = buildAdaptiveWindowRequest({
      eeg: eeg(0.34),
      signalThreshold: 0.35,
      windowIndex: 3,
      windowSec: 300,
      windowStartAt: '2026-06-01T00:00:00Z',
    });

    expect(request).toMatchObject({
      dominantBand: 'alpha',
      qualityScore: 0.34,
      sampleCount: 76800,
      sampleRateHz: 256,
      signalOk: false,
      windowDurationSec: 300,
      windowIndex: 3,
    });
  });

  it('captures repeated windows and submits each result into the store', async () => {
    useAdaptiveSessionStore.getState().applyGetResponse(activeSession());

    const measure = vi
      .fn()
      .mockImplementationOnce(async (_durationSec: number, onTick: (tick: MuseMeasureTick) => void) => {
        onTick({ elapsedSec: 1, sampleBufferLen: 256, signalScore: 0.8 });
        return eeg(0.8);
      })
      .mockImplementationOnce(async (_durationSec: number, onTick: (tick: MuseMeasureTick) => void) => {
        onTick({ elapsedSec: 1, sampleBufferLen: 512, signalScore: 0.9 });
        return eeg(0.9);
      });
    const submitWindow = vi
      .fn()
      .mockImplementationOnce(async () => response(1))
      .mockImplementationOnce(async () => response(2));
    const loop = createAdaptiveCaptureLoop({
      adaptiveGateway: { submitWindow },
      maxWindows: 2,
      museGateway: { measure },
      now: () => Date.parse('2026-06-01T00:00:00Z'),
      sessionId: 'adaptive_loop',
      store: useAdaptiveSessionStore,
      windowSec: 300,
    });

    await loop.start();

    expect(measure).toHaveBeenCalledTimes(2);
    expect(submitWindow).toHaveBeenCalledTimes(2);
    expect(submitWindow.mock.calls.map((call) => call[1].windowIndex)).toEqual([0, 1]);
    expect(useAdaptiveSessionStore.getState()).toMatchObject({
      lastSampleBufferLen: 512,
      lastSignalScore: 0.9,
      nextWindowIndex: 2,
      wearStatus: 'worn',
    });
    expect(useAdaptiveSessionStore.getState().recentWindows.map((window) => window.windowId)).toEqual([2, 1]);
  });

  it('marks low signal ticks as uncertain but still submits the window', async () => {
    useAdaptiveSessionStore.getState().applyGetResponse(activeSession());

    const measure = vi.fn(async (_durationSec: number, onTick: (tick: MuseMeasureTick) => void) => {
      onTick({ elapsedSec: 1, sampleBufferLen: 256, signalScore: 0.2 });
      return eeg(0.2);
    });
    const submitWindow = vi.fn(async () => response(1));
    const loop = createAdaptiveCaptureLoop({
      adaptiveGateway: { submitWindow },
      maxWindows: 1,
      museGateway: { measure },
      sessionId: 'adaptive_loop',
      store: useAdaptiveSessionStore,
      windowSec: 300,
    });

    await loop.start();

    expect(submitWindow).toHaveBeenCalledWith(
      'adaptive_loop',
      expect.objectContaining({
        signalOk: false,
      }),
    );
    expect(useAdaptiveSessionStore.getState().wearStatus).toBe('uncertain');
  });

  it('aborts an in-flight measure on stop and does not submit a partial window', async () => {
    vi.useFakeTimers();
    useAdaptiveSessionStore.getState().applyGetResponse(activeSession());

    const measure = vi.fn(
      (_durationSec: number, _onTick: (tick: MuseMeasureTick) => void, options?: { signal?: AbortSignal }) =>
        new Promise<MeasureEeg>((_resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('measure should have been aborted'));
          }, 60_000);

          options?.signal?.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new Error('measure aborted'));
          });
        }),
    );
    const submitWindow = vi.fn(async () => response(1));
    const loop = createAdaptiveCaptureLoop({
      adaptiveGateway: { submitWindow },
      museGateway: { measure },
      sessionId: 'adaptive_loop',
      store: useAdaptiveSessionStore,
      windowSec: 300,
    });

    const running = loop.start();
    await Promise.resolve();
    expect(loop.isRunning()).toBe(true);

    loop.stop();
    await running;

    expect(loop.isRunning()).toBe(false);
    expect(submitWindow).not.toHaveBeenCalled();
  });

  it('does not start capture when the session is not active', async () => {
    const measure = vi.fn(async () => eeg(0.9));
    const submitWindow = vi.fn(async () => response(1));
    const loop = createAdaptiveCaptureLoop({
      adaptiveGateway: { submitWindow },
      maxWindows: 1,
      museGateway: { measure },
      sessionId: 'missing_session',
      store: useAdaptiveSessionStore,
      windowSec: 300,
    });

    await loop.start();

    expect(measure).not.toHaveBeenCalled();
    expect(submitWindow).not.toHaveBeenCalled();
  });
});
