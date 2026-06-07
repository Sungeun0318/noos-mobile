import type { AdaptiveAction, AdaptiveSegmentView } from '@/api/adaptiveTypes';

export type AdaptivePlaybackDecision =
  | 'adjust-volume'
  | 'continue'
  | 'crossfade-next'
  | 'loop-extend';

export interface AdaptivePlaybackPlan {
  decision: AdaptivePlaybackDecision;
  currentSegment: AdaptiveSegmentView | null;
  nextSegment: AdaptiveSegmentView | null;
  targetVolume: number;
}

export interface AdaptivePlaybackPlanInput {
  segments: AdaptiveSegmentView[];
  currentSegmentIndex: number | null;
  lastAction: AdaptiveAction | null;
}

function clampVolume(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 1;
  }

  return Math.max(0, Math.min(value, 1));
}

function orderedSegments(segments: AdaptiveSegmentView[]) {
  return [...segments].sort((a, b) => a.index - b.index);
}

function currentSegmentFor(segments: AdaptiveSegmentView[], currentSegmentIndex: number | null) {
  if (segments.length === 0) {
    return null;
  }

  if (currentSegmentIndex !== null) {
    return segments.find((segment) => segment.index === currentSegmentIndex) ?? segments[0] ?? null;
  }

  return segments.find((segment) => segment.status === 'ready' && segment.audioId) ?? segments[0] ?? null;
}

function nextSegmentFor(segments: AdaptiveSegmentView[], currentSegment: AdaptiveSegmentView | null) {
  if (!currentSegment) {
    return null;
  }

  return segments.find((segment) => segment.index > currentSegment.index) ?? null;
}

function canPlay(segment: AdaptiveSegmentView | null) {
  return segment?.status === 'ready' && Boolean(segment.audioId);
}

export function buildAdaptivePlaybackPlan(input: AdaptivePlaybackPlanInput): AdaptivePlaybackPlan {
  const segments = orderedSegments(input.segments);
  const currentSegment = currentSegmentFor(segments, input.currentSegmentIndex);
  const nextSegment = nextSegmentFor(segments, currentSegment);
  const actionType = input.lastAction?.type ?? 'none';

  if (!currentSegment || !canPlay(currentSegment)) {
    return {
      currentSegment,
      decision: 'continue',
      nextSegment,
      targetVolume: 1,
    };
  }

  if (actionType === 'parameter_adjust') {
    return {
      currentSegment,
      decision: 'adjust-volume',
      nextSegment,
      targetVolume: clampVolume(input.lastAction?.volumeScale),
    };
  }

  if (actionType === 'crossfade') {
    return {
      currentSegment,
      decision: canPlay(nextSegment) ? 'crossfade-next' : 'loop-extend',
      nextSegment,
      targetVolume: 1,
    };
  }

  return {
    currentSegment,
    decision: 'continue',
    nextSegment,
    targetVolume: 1,
  };
}
