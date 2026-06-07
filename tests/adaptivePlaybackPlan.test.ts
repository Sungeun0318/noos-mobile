import { describe, expect, it } from 'vitest';

import type { AdaptiveAction, AdaptiveSegmentView } from '@/api/adaptiveTypes';
import { buildAdaptivePlaybackPlan } from '@/screens/journey/adaptivePlaybackPlan';

function segment(index: number, overrides: Partial<AdaptiveSegmentView> = {}): AdaptiveSegmentView {
  return {
    audioId: `audio_${index}`,
    createdAt: '2026-06-01T00:00:00Z',
    durationSec: 120,
    fallback: false,
    genReadyAt: '2026-06-01T00:01:00Z',
    genStartedAt: '2026-06-01T00:00:00Z',
    index,
    planet: 'Mars',
    playedAt: null,
    segmentId: index + 1,
    status: 'ready',
    ...overrides,
  };
}

const noneAction: AdaptiveAction = {
  label: '유지',
  reason: 'stable',
  type: 'none',
  volumeScale: 1,
};

describe('buildAdaptivePlaybackPlan', () => {
  it('continues current playback for none action', () => {
    const plan = buildAdaptivePlaybackPlan({
      currentSegmentIndex: 0,
      lastAction: noneAction,
      segments: [segment(0), segment(1)],
    });

    expect(plan.decision).toBe('continue');
    expect(plan.currentSegment?.index).toBe(0);
    expect(plan.targetVolume).toBe(1);
  });

  it('uses crossfade-next when crossfade action has a ready next segment', () => {
    const plan = buildAdaptivePlaybackPlan({
      currentSegmentIndex: 0,
      lastAction: { label: '전환', reason: 'delta', type: 'crossfade', volumeScale: 1 },
      segments: [segment(0), segment(1)],
    });

    expect(plan.decision).toBe('crossfade-next');
    expect(plan.nextSegment?.index).toBe(1);
  });

  it('falls back to loop-extend when crossfade action has no ready next segment', () => {
    const plan = buildAdaptivePlaybackPlan({
      currentSegmentIndex: 0,
      lastAction: { label: '전환', reason: 'delta', type: 'crossfade', volumeScale: 1 },
      segments: [segment(0), segment(1, { audioId: null, status: 'generating' })],
    });

    expect(plan.decision).toBe('loop-extend');
  });

  it('adjusts current volume for parameter adjust action', () => {
    const plan = buildAdaptivePlaybackPlan({
      currentSegmentIndex: 0,
      lastAction: { label: '볼륨 조정', reason: 'mild_delta', type: 'parameter_adjust', volumeScale: 0.65 },
      segments: [segment(0), segment(1)],
    });

    expect(plan.decision).toBe('adjust-volume');
    expect(plan.targetVolume).toBe(0.65);
  });

  it('clamps invalid volume scale and handles empty segments safely', () => {
    const empty = buildAdaptivePlaybackPlan({
      currentSegmentIndex: null,
      lastAction: null,
      segments: [],
    });
    const clamped = buildAdaptivePlaybackPlan({
      currentSegmentIndex: 0,
      lastAction: { label: '볼륨 조정', reason: 'mild_delta', type: 'parameter_adjust', volumeScale: 2 },
      segments: [segment(0)],
    });

    expect(empty).toMatchObject({ currentSegment: null, decision: 'continue', nextSegment: null });
    expect(clamped.targetVolume).toBe(1);
  });
});
