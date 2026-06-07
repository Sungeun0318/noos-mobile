import { describe, expect, it } from 'vitest';

import type { AdaptiveEegWindowView } from '@/api/adaptiveTypes';
import { buildAdaptiveGraphData } from '@/screens/journey/adaptiveGraphData';

function windowFixture(
  index: number,
  overrides: Partial<AdaptiveEegWindowView> = {},
): AdaptiveEegWindowView {
  return {
    adaptiveAction: 'none',
    bands: {
      alpha: 0.4,
      beta: 0.2,
      delta: 0.1,
      gamma: 0.05,
      theta: 0.3,
    },
    createdAt: `2026-05-01T00:0${index}:00.000Z`,
    currentState: {
      corticalArousal: 0.45,
      fatigueRisk: 0.2,
      focusReadiness: 0.5,
      mentalWorkload: 0.25,
      relaxationLevel: 0.6,
      stressLoad: 0.3,
    },
    dominantBand: 'alpha',
    durationSec: 300,
    index,
    qualityScore: 0.8,
    sampleCount: 76800,
    sampleRateHz: 256,
    signalOk: true,
    stateLabel: 'steady reset',
    windowEndAt: `2026-05-01T00:0${index}:30.000Z`,
    windowId: index,
    windowStartAt: `2026-05-01T00:0${index}:00.000Z`,
    ...overrides,
  };
}

describe('buildAdaptiveGraphData', () => {
  it('returns empty graph data safely', () => {
    const data = buildAdaptiveGraphData([]);

    expect(data.hasData).toBe(false);
    expect(data.deltas).toEqual([]);
    expect(data.timeline).toEqual([]);
    expect(data.series).toHaveLength(5);
    expect(data.series.every((series) => series.points.length === 0)).toBe(true);
  });

  it('sorts windows and derives normalized band series', () => {
    const data = buildAdaptiveGraphData([
      windowFixture(2, { bands: { alpha: 1, beta: 0.4, delta: 0.2, gamma: 0.1, theta: 0.6 } }),
      windowFixture(1, { bands: { alpha: 0.5, beta: 0.2, delta: 0.1, gamma: 0.05, theta: 0.3 } }),
    ]);
    const alpha = data.series.find((series) => series.key === 'alpha');

    expect(data.hasData).toBe(true);
    expect(alpha?.points.map((point) => point.index)).toEqual([1, 2]);
    expect(alpha?.points.map((point) => point.normalized)).toEqual([0.5, 1]);
    expect(data.timeline.map((point) => point.index)).toEqual([1, 2]);
  });

  it('derives top state deltas from the latest two windows', () => {
    const data = buildAdaptiveGraphData([
      windowFixture(1),
      windowFixture(2, {
        currentState: {
          corticalArousal: 0.47,
          fatigueRisk: 0.26,
          focusReadiness: 0.68,
          mentalWorkload: 0.21,
          relaxationLevel: 0.63,
          stressLoad: 0.12,
        },
      }),
    ]);

    expect(data.deltas.map((delta) => delta.text)).toEqual(['집중↑', '스트레스↓', '피로↑']);
    expect(data.deltas[0]?.direction).toBe('up');
  });

  it('handles a single window without delta labels', () => {
    const data = buildAdaptiveGraphData([windowFixture(1)]);

    expect(data.hasData).toBe(true);
    expect(data.deltas).toEqual([]);
    expect(data.timeline).toHaveLength(1);
  });

  it('limits the chart to the latest maxPoints windows', () => {
    const windows = Array.from({ length: 6 }, (_, index) => windowFixture(index + 1));
    const data = buildAdaptiveGraphData(windows, 3);

    expect(data.timeline.map((point) => point.index)).toEqual([4, 5, 6]);
    expect(data.series[0]?.points.map((point) => point.index)).toEqual([4, 5, 6]);
  });
});
