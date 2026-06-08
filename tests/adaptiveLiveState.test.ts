import { describe, expect, it } from 'vitest';

import {
  appendLiveBandPoint,
  type AdaptiveLiveBandPoint,
  buildLiveBandSeries,
  normalizeLiveBands,
  sixAxisFromLiveBands,
  smoothSixAxis,
} from '@/adaptive/adaptiveLiveState';
import type { AdaptiveSixAxis } from '@/api/adaptiveTypes';

describe('adaptiveLiveState', () => {
  it('normalizes raw band power before mapping to six-axis state', () => {
    const normalized = normalizeLiveBands({
      alpha: 30,
      beta: 20,
      delta: 10,
      gamma: 10,
      theta: 30,
    });

    expect(normalized).toEqual({
      alpha: 0.3,
      beta: 0.2,
      delta: 0.1,
      gamma: 0.1,
      theta: 0.3,
    });

    const state = sixAxisFromLiveBands({
      alpha: 30,
      beta: 20,
      delta: 10,
      gamma: 10,
      theta: 30,
    });

    expect(state.focusReadiness).toBeGreaterThan(0);
    expect(state.focusReadiness).toBeLessThan(1);
    expect(state.stressLoad).toBeLessThan(1);
  });

  it('keeps alpha-heavy input more relaxed than beta/gamma-heavy input', () => {
    const alphaState = sixAxisFromLiveBands({
      alpha: 70,
      beta: 10,
      delta: 5,
      gamma: 5,
      theta: 10,
    });
    const stressState = sixAxisFromLiveBands({
      alpha: 10,
      beta: 45,
      delta: 5,
      gamma: 30,
      theta: 10,
    });

    expect(alphaState.relaxationLevel).toBeGreaterThan(stressState.relaxationLevel ?? 0);
    expect(stressState.stressLoad).toBeGreaterThan(alphaState.stressLoad ?? 0);
  });

  it('smooths six-axis updates with EMA', () => {
    const previous = sixAxisFromLiveBands({
      alpha: 70,
      beta: 10,
      delta: 5,
      gamma: 5,
      theta: 10,
    });
    const next = sixAxisFromLiveBands({
      alpha: 10,
      beta: 45,
      delta: 5,
      gamma: 30,
      theta: 10,
    });
    const smoothed = smoothSixAxis(previous, next, 0.5);

    expect(smoothed.stressLoad).toBeGreaterThan(previous.stressLoad ?? 0);
    expect(smoothed.stressLoad).toBeLessThan(next.stressLoad ?? 1);
  });

  it('appends live points with cap and builds chart series', () => {
    let points: AdaptiveLiveBandPoint[] = [];
    let liveSixAxis: AdaptiveSixAxis | null = null;

    for (let index = 0; index < 3; index += 1) {
      const state = appendLiveBandPoint({
        limit: 2,
        now: () => Date.parse('2026-06-01T00:00:00Z') + index * 1000,
        points,
        previousSixAxis: liveSixAxis,
        tick: {
          bands: {
            alpha: 20 + index,
            beta: 10,
            delta: 5,
            gamma: 5,
            theta: 10,
          },
          elapsedSec: index + 1,
          sampleBufferLen: (index + 1) * 256,
          signalScore: 0.8,
        },
      });
      points = state.liveBands;
      liveSixAxis = state.liveSixAxis;
    }

    expect(points).toHaveLength(2);
    expect(points.map((point) => point.index)).toEqual([1, 2]);
    expect(liveSixAxis?.relaxationLevel).toBeGreaterThan(0);
    expect(buildLiveBandSeries(points)).toHaveLength(5);
  });
});
