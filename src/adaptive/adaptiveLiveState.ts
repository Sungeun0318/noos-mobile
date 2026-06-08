import type { AdaptiveBands, AdaptiveSixAxis } from '@/api/adaptiveTypes';
import type { EegBands } from '@/screens/measure/eegBands';

export interface AdaptiveLiveBandPoint {
  bands: EegBands;
  capturedAt: string;
  elapsedSec: number | null;
  index: number;
  normalized: Record<keyof EegBands, number>;
  sampleBufferLen: number;
  signalScore: number;
}

export interface CaptureTickWithBands {
  bands?: EegBands;
  elapsedSec?: number;
  sampleBufferLen: number;
  signalScore: number;
}

export interface LiveBandSeriesPoint {
  normalized: number;
  value: number;
}

export interface LiveBandSeries {
  key: keyof EegBands;
  label: string;
  points: LiveBandSeriesPoint[];
}

export const liveBandBufferLimit = 120;
export const liveSixAxisSmoothingAlpha = 0.12;

const bandLabels: Record<keyof EegBands, string> = {
  alpha: 'Alpha',
  beta: 'Beta',
  delta: 'Delta',
  gamma: 'Gamma',
  theta: 'Theta',
};

function clamp01(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(value, 1));
}

function bandValue(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}

function round(value: number) {
  return Number(value.toFixed(3));
}

export function normalizeLiveBands(bands: EegBands | AdaptiveBands): Record<keyof EegBands, number> {
  const raw = {
    alpha: bandValue(bands.alpha),
    beta: bandValue(bands.beta),
    delta: bandValue(bands.delta),
    gamma: bandValue(bands.gamma),
    theta: bandValue(bands.theta),
  };
  const total = raw.alpha + raw.beta + raw.delta + raw.gamma + raw.theta;

  if (total <= 0) {
    return {
      alpha: 0,
      beta: 0,
      delta: 0,
      gamma: 0,
      theta: 0,
    };
  }

  return {
    alpha: round(raw.alpha / total),
    beta: round(raw.beta / total),
    delta: round(raw.delta / total),
    gamma: round(raw.gamma / total),
    theta: round(raw.theta / total),
  };
}

export function sixAxisFromLiveBands(bands: EegBands | AdaptiveBands): AdaptiveSixAxis {
  const normalized = normalizeLiveBands(bands);
  const { alpha, beta, delta, gamma, theta } = normalized;
  const focusReadiness = clamp01(beta * 0.45 + alpha * 0.2 + (1 - theta) * 0.2 + (1 - gamma) * 0.15);
  const stressLoad = clamp01(beta * 0.55 + gamma * 0.2 + (1 - alpha) * 0.25);
  const fatigueRisk = clamp01(theta * 0.45 + delta * 0.2 + alpha * 0.2 + (1 - beta) * 0.15);
  const relaxationLevel = clamp01(alpha * 0.5 + (1 - beta) * 0.3 + (1 - gamma) * 0.2);
  const corticalArousal = clamp01((focusReadiness + (1 - relaxationLevel)) / 2);
  const mentalWorkload = clamp01((stressLoad + fatigueRisk) / 2);

  return {
    corticalArousal: round(corticalArousal),
    fatigueRisk: round(fatigueRisk),
    focusReadiness: round(focusReadiness),
    mentalWorkload: round(mentalWorkload),
    relaxationLevel: round(relaxationLevel),
    stressLoad: round(stressLoad),
  };
}

export function smoothSixAxis(
  previous: AdaptiveSixAxis | null,
  next: AdaptiveSixAxis,
  alpha = liveSixAxisSmoothingAlpha,
): AdaptiveSixAxis {
  if (!previous) {
    return next;
  }

  const mix = (from: number | null, to: number | null) =>
    round(clamp01((from ?? 0) + ((to ?? 0) - (from ?? 0)) * alpha));

  return {
    corticalArousal: mix(previous.corticalArousal, next.corticalArousal),
    fatigueRisk: mix(previous.fatigueRisk, next.fatigueRisk),
    focusReadiness: mix(previous.focusReadiness, next.focusReadiness),
    mentalWorkload: mix(previous.mentalWorkload, next.mentalWorkload),
    relaxationLevel: mix(previous.relaxationLevel, next.relaxationLevel),
    stressLoad: mix(previous.stressLoad, next.stressLoad),
  };
}

export function appendLiveBandPoint({
  limit = liveBandBufferLimit,
  now = Date.now,
  points,
  previousSixAxis,
  tick,
}: {
  limit?: number;
  now?: () => number;
  points: AdaptiveLiveBandPoint[];
  previousSixAxis: AdaptiveSixAxis | null;
  tick: CaptureTickWithBands;
}): {
  liveBands: AdaptiveLiveBandPoint[];
  liveSixAxis: AdaptiveSixAxis | null;
} {
  if (!tick.bands) {
    return {
      liveBands: points,
      liveSixAxis: previousSixAxis,
    };
  }

  const point: AdaptiveLiveBandPoint = {
    bands: tick.bands,
    capturedAt: new Date(now()).toISOString(),
    elapsedSec: typeof tick.elapsedSec === 'number' ? tick.elapsedSec : null,
    index: (points[points.length - 1]?.index ?? -1) + 1,
    normalized: normalizeLiveBands(tick.bands),
    sampleBufferLen: tick.sampleBufferLen,
    signalScore: tick.signalScore,
  };
  const liveBands = [...points, point].slice(-limit);
  const liveSixAxis = smoothSixAxis(previousSixAxis, sixAxisFromLiveBands(tick.bands));

  return {
    liveBands,
    liveSixAxis,
  };
}

export function buildLiveBandSeries(points: AdaptiveLiveBandPoint[], maxPoints = 60): LiveBandSeries[] {
  const sampled = points.slice(-maxPoints);

  return (Object.keys(bandLabels) as Array<keyof EegBands>).map((key) => ({
    key,
    label: bandLabels[key],
    points: sampled.map((point) => ({
      normalized: point.normalized[key],
      value: point.bands[key],
    })),
  }));
}
