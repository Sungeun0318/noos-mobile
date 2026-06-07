import type { AdaptiveEegWindowView, AdaptiveSixAxis } from '@/api/adaptiveTypes';

export type BandKey = 'alpha' | 'beta' | 'theta' | 'delta' | 'gamma';
export type DeltaDirection = 'up' | 'down' | 'flat';

export interface BandSeriesPoint {
  index: number;
  value: number;
  normalized: number;
}

export interface BandSeries {
  key: BandKey;
  label: string;
  points: BandSeriesPoint[];
}

export interface StateDelta {
  key: keyof AdaptiveSixAxis;
  label: string;
  direction: DeltaDirection;
  value: number;
  text: string;
}

export interface TimelinePoint {
  id: number;
  index: number;
  dominantBand: string | null;
  action: string | null;
  signalOk: boolean;
}

export interface AdaptiveGraphData {
  series: BandSeries[];
  deltas: StateDelta[];
  timeline: TimelinePoint[];
  hasData: boolean;
}

const bandMeta: Array<{ key: BandKey; label: string }> = [
  { key: 'alpha', label: 'α' },
  { key: 'beta', label: 'β' },
  { key: 'theta', label: 'θ' },
  { key: 'delta', label: 'δ' },
  { key: 'gamma', label: 'γ' },
];

const stateMeta: Array<{ key: keyof AdaptiveSixAxis; label: string }> = [
  { key: 'focusReadiness', label: '집중' },
  { key: 'stressLoad', label: '스트레스' },
  { key: 'fatigueRisk', label: '피로' },
  { key: 'relaxationLevel', label: '이완' },
  { key: 'corticalArousal', label: '각성' },
  { key: 'mentalWorkload', label: '인지부하' },
];

function numeric(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function sortWindows(windows: AdaptiveEegWindowView[]) {
  return [...windows].sort((a, b) => a.index - b.index || a.windowId - b.windowId);
}

function trimPoints<T>(items: T[], maxPoints: number) {
  return items.slice(Math.max(items.length - maxPoints, 0));
}

function normalizeValues(values: number[]) {
  const max = Math.max(...values, 0);

  if (max <= 0) {
    return values.map(() => 0);
  }

  return values.map((value) => value / max);
}

function directionFor(delta: number): DeltaDirection {
  if (Math.abs(delta) < 0.01) {
    return 'flat';
  }

  return delta > 0 ? 'up' : 'down';
}

function directionText(direction: DeltaDirection) {
  if (direction === 'up') {
    return '↑';
  }

  if (direction === 'down') {
    return '↓';
  }

  return '→';
}

export function buildAdaptiveGraphData(
  windows: AdaptiveEegWindowView[],
  maxPoints = 24,
): AdaptiveGraphData {
  const ordered = trimPoints(sortWindows(windows), maxPoints);
  const latest = ordered[ordered.length - 1];
  const previous = ordered[ordered.length - 2];

  const series = bandMeta.map((band) => {
    const values = ordered.map((window) => numeric(window.bands[band.key]));
    const normalized = normalizeValues(values);

    return {
      key: band.key,
      label: band.label,
      points: ordered.map((window, index) => ({
        index: window.index,
        normalized: normalized[index] ?? 0,
        value: values[index] ?? 0,
      })),
    };
  });

  const deltas = latest?.currentState && previous?.currentState
    ? stateMeta
        .map((axis) => {
          const value = numeric(latest.currentState?.[axis.key]) - numeric(previous.currentState?.[axis.key]);
          const direction = directionFor(value);

          return {
            direction,
            key: axis.key,
            label: axis.label,
            text: `${axis.label}${directionText(direction)}`,
            value,
          };
        })
        .filter((delta) => delta.direction !== 'flat')
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
        .slice(0, 3)
    : [];

  return {
    deltas,
    hasData: ordered.length > 0,
    series,
    timeline: ordered.map((window) => ({
      action: window.adaptiveAction,
      dominantBand: window.dominantBand,
      id: window.windowId,
      index: window.index,
      signalOk: window.signalOk,
    })),
  };
}
