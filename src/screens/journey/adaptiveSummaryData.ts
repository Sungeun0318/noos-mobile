import type {
  AdaptiveActionType,
  AdaptiveEegWindowView,
  AdaptiveSegmentView,
  AdaptiveSessionResponse,
  AdaptiveSixAxis,
} from '@/api/adaptiveTypes';
import { normalizeAdaptivePlanet } from '@/api/adaptiveTypes';
import { buildAdaptiveGraphData, type AdaptiveGraphData, type DeltaDirection } from '@/screens/journey/adaptiveGraphData';
import { PLANETS, type PlanetId } from '@/theme';

export interface AdaptiveAxisChange {
  direction: DeltaDirection;
  from: number;
  key: keyof AdaptiveSixAxis;
  label: string;
  text: string;
  to: number;
  value: number;
}

export interface AdaptiveTransitionSummary {
  action: AdaptiveActionType | string | null;
  dominantBand: string | null;
  index: number;
  label: string;
  signalOk: boolean;
  windowId: number;
}

export interface AdaptiveSummaryData {
  adjustmentCount: number;
  axisChanges: AdaptiveAxisChange[];
  generatedSegmentCount: number;
  graphData: AdaptiveGraphData;
  hasWindows: boolean;
  planet: PlanetId;
  planetTitle: string;
  segmentCount: number;
  sessionId: string;
  timeline: AdaptiveTransitionSummary[];
  totalDurationSec: number;
}

const axisMeta: Array<{ key: keyof AdaptiveSixAxis; label: string }> = [
  { key: 'focusReadiness', label: '집중 준비' },
  { key: 'stressLoad', label: '스트레스' },
  { key: 'fatigueRisk', label: '피로 위험' },
  { key: 'relaxationLevel', label: '이완' },
  { key: 'corticalArousal', label: '각성' },
  { key: 'mentalWorkload', label: '인지 부하' },
];

export function buildAdaptiveSummaryData(session: AdaptiveSessionResponse): AdaptiveSummaryData {
  const windows = sortWindows(session.recentWindows);
  const firstState = firstWindowState(windows);
  const lastState = lastWindowState(windows);
  const planet = normalizeAdaptivePlanet(session.currentPlanet ?? session.initialPlanet);

  return {
    adjustmentCount: windows.filter((window) => window.adaptiveAction === 'crossfade').length,
    axisChanges: firstState && lastState ? buildAxisChanges(firstState, lastState) : [],
    generatedSegmentCount: countGeneratedSegments(session.segments),
    graphData: buildAdaptiveGraphData(windows),
    hasWindows: windows.length > 0,
    planet,
    planetTitle: PLANETS[planet].title,
    segmentCount: session.segments.length,
    sessionId: session.sessionId,
    timeline: windows.map((window) => ({
      action: window.adaptiveAction,
      dominantBand: window.dominantBand,
      index: window.index,
      label: actionLabel(window.adaptiveAction),
      signalOk: window.signalOk,
      windowId: window.windowId,
    })),
    totalDurationSec: totalDurationSec(session),
  };
}

function buildAxisChanges(first: AdaptiveSixAxis, last: AdaptiveSixAxis): AdaptiveAxisChange[] {
  return axisMeta
    .map((axis) => {
      const from = numeric(first[axis.key]);
      const to = numeric(last[axis.key]);
      const value = to - from;
      const direction = directionFor(value);

      return {
        direction,
        from,
        key: axis.key,
        label: axis.label,
        text: `${axis.label} ${directionText(direction)}`,
        to,
        value,
      };
    })
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}

function sortWindows(windows: AdaptiveEegWindowView[]) {
  return [...windows].sort((a, b) => a.index - b.index || a.windowId - b.windowId);
}

function firstWindowState(windows: AdaptiveEegWindowView[]) {
  return windows.find((window) => window.currentState)?.currentState ?? null;
}

function lastWindowState(windows: AdaptiveEegWindowView[]) {
  return [...windows].reverse().find((window) => window.currentState)?.currentState ?? null;
}

function countGeneratedSegments(segments: AdaptiveSegmentView[]) {
  return segments.filter((segment) => Boolean(segment.audioId) && segment.status !== 'failed').length;
}

function totalDurationSec(session: AdaptiveSessionResponse) {
  const segmentTotal = session.segments.reduce((sum, segment) => sum + segment.durationSec, 0);

  if (segmentTotal > 0) {
    return segmentTotal;
  }

  if (session.startedAt && session.endedAt) {
    const elapsedMs = Date.parse(session.endedAt) - Date.parse(session.startedAt);

    return Number.isFinite(elapsedMs) && elapsedMs > 0 ? Math.round(elapsedMs / 1_000) : 0;
  }

  return 0;
}

function numeric(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function directionFor(delta: number): DeltaDirection {
  if (Math.abs(delta) < 0.01) {
    return 'flat';
  }

  return delta > 0 ? 'up' : 'down';
}

function directionText(direction: DeltaDirection) {
  if (direction === 'up') {
    return '증가';
  }

  if (direction === 'down') {
    return '감소';
  }

  return '유지';
}

function actionLabel(action: AdaptiveActionType | string | null) {
  if (action === 'crossfade') {
    return '음악 전환';
  }

  if (action === 'parameter_adjust') {
    return '강도 조정';
  }

  return '현재 흐름 유지';
}
