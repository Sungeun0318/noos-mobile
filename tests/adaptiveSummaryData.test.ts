import { describe, expect, it } from 'vitest';

import type { AdaptiveSessionResponse } from '@/api/adaptiveTypes';
import {
  buildAdaptiveSummaryData,
  getAdaptiveSummaryEmptyText,
} from '@/screens/journey/adaptiveSummaryData';

function adaptiveSession(): AdaptiveSessionResponse {
  return {
    createdAt: '2026-06-01T00:00:00Z',
    currentPlanet: 'Venus',
    currentSegment: null,
    endedAt: '2026-06-01T00:12:00Z',
    initialPlanet: 'Venus',
    nextSegment: null,
    pausedAt: null,
    pausedReason: null,
    recentWindows: [
      {
        adaptiveAction: 'none',
        bands: {
          alpha: 0.2,
          beta: 0.3,
          delta: 0.1,
          gamma: 0.1,
          theta: 0.2,
        },
        createdAt: '2026-06-01T00:05:00Z',
        currentState: {
          corticalArousal: 0.45,
          fatigueRisk: 0.3,
          focusReadiness: 0.4,
          mentalWorkload: 0.4,
          relaxationLevel: 0.45,
          stressLoad: 0.5,
        },
        dominantBand: 'beta',
        durationSec: 300,
        index: 0,
        qualityScore: 0.7,
        sampleCount: 76800,
        sampleRateHz: 256,
        signalOk: true,
        stateLabel: '현재 흐름 유지',
        windowEndAt: '2026-06-01T00:05:00Z',
        windowId: 1,
        windowStartAt: '2026-06-01T00:00:00Z',
      },
      {
        adaptiveAction: 'crossfade',
        bands: {
          alpha: 0.7,
          beta: 0.2,
          delta: 0.1,
          gamma: 0.1,
          theta: 0.3,
        },
        createdAt: '2026-06-01T00:10:00Z',
        currentState: {
          corticalArousal: 0.35,
          fatigueRisk: 0.2,
          focusReadiness: 0.75,
          mentalWorkload: 0.25,
          relaxationLevel: 0.8,
          stressLoad: 0.25,
        },
        dominantBand: 'alpha',
        durationSec: 300,
        index: 1,
        qualityScore: 0.85,
        sampleCount: 76800,
        sampleRateHz: 256,
        signalOk: true,
        stateLabel: '음악 전환',
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
        genReadyAt: '2026-06-01T00:01:00Z',
        genStartedAt: '2026-06-01T00:00:10Z',
        index: 0,
        planet: 'Venus',
        playedAt: null,
        segmentId: 1,
        status: 'ready',
      },
      {
        audioId: 'audio_next',
        createdAt: '2026-06-01T00:05:00Z',
        durationSec: 120,
        fallback: false,
        genReadyAt: '2026-06-01T00:06:00Z',
        genStartedAt: '2026-06-01T00:05:10Z',
        index: 1,
        planet: 'Venus',
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

describe('adaptiveSummaryData', () => {
  it('derives session totals, adjustment count, and axis changes', () => {
    const summary = buildAdaptiveSummaryData(adaptiveSession(), { simulationMode: false });

    expect(summary).toMatchObject({
      adjustmentCount: 1,
      generatedSegmentCount: 2,
      planet: 'venus',
      segmentCount: 2,
      totalDurationSec: 240,
    });
    expect(summary.timeline).toHaveLength(2);
    expect(summary.timeline[1]).toMatchObject({
      action: 'crossfade',
      label: '음악 전환',
    });
    expect(summary.axisChanges.find((change) => change.key === 'relaxationLevel')).toMatchObject({
      direction: 'up',
      key: 'relaxationLevel',
    });
    expect(summary.graphData.hasData).toBe(true);
    expect(summary.mode).toMatchObject({
      key: 'realEeg',
      label: '실시간 EEG',
    });
  });

  it('handles a session without windows or generated segments', () => {
    const session = {
      ...adaptiveSession(),
      recentWindows: [],
      segments: [],
    };
    const summary = buildAdaptiveSummaryData(session, { simulationMode: true });

    expect(summary.adjustmentCount).toBe(0);
    expect(summary.axisChanges).toEqual([]);
    expect(summary.generatedSegmentCount).toBe(0);
    expect(summary.hasWindows).toBe(false);
    expect(summary.timeline).toEqual([]);
    expect(summary.totalDurationSec).toBe(720);
    expect(summary.mode.key).toBe('simEeg');
    expect(getAdaptiveSummaryEmptyText(summary.mode, 'axis')).toBe(
      '체험 모드 · 실시간 EEG 적응 데이터가 없습니다.',
    );
  });

  it('keeps real EEG empty copy distinct from experience modes', () => {
    const summary = buildAdaptiveSummaryData(
      {
        ...adaptiveSession(),
        recentWindows: [],
      },
      { simulationMode: false },
    );

    expect(getAdaptiveSummaryEmptyText(summary.mode, 'axis')).toBe('아직 비교할 EEG 윈도우가 부족합니다.');
    expect(getAdaptiveSummaryEmptyText(summary.mode, 'timeline')).toBe('세션 중 수집된 윈도우가 아직 없습니다.');
    expect(getAdaptiveSummaryEmptyText(summary.mode, 'bands')).toBe('밴드 기록이 충분하지 않습니다.');
  });
});
