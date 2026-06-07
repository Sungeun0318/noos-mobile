import { describe, expect, it } from 'vitest';

import type { AdaptiveSegmentView, AdaptiveSessionResponse } from '@/api/adaptiveTypes';
import {
  buildAdaptivePlayerViewModel,
  getNextGenState,
  getSegmentStatusLabel,
  getSignalLabel,
  getWearLabel,
} from '@/screens/journey/adaptivePlayerState';

function segment(
  status: AdaptiveSegmentView['status'],
  patch: Partial<AdaptiveSegmentView> = {},
): AdaptiveSegmentView {
  return {
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
    ...patch,
  };
}

function session(currentSegment: AdaptiveSegmentView | null): AdaptiveSessionResponse {
  return {
    createdAt: '2026-06-01T00:00:00Z',
    currentPlanet: 'Mars',
    currentSegment,
    endedAt: null,
    initialPlanet: 'Mars',
    nextSegment: null,
    pausedAt: null,
    pausedReason: null,
    recentWindows: [],
    seedSource: 'eeg',
    segments: currentSegment ? [currentSegment] : [],
    sessionId: 'adaptive_1',
    startedAt: '2026-06-01T00:00:00Z',
    status: 'active',
  };
}

describe('adaptivePlayerState', () => {
  it('labels segment generation states', () => {
    expect(getSegmentStatusLabel(segment('pending'))).toBe('생성 대기 중');
    expect(getSegmentStatusLabel(segment('generating'))).toBe('음악 생성 중');
    expect(getSegmentStatusLabel(segment('ready', { audioId: 'audio_1' }))).toBe('재생 준비 완료');
  });

  it('labels next generation states', () => {
    expect(getNextGenState('idle')).toMatchObject({ label: '다음 세그먼트 없음', tone: 'idle' });
    expect(getNextGenState('generating')).toMatchObject({ label: '다음 세그먼트 생성 중', tone: 'working' });
    expect(getNextGenState('ready')).toMatchObject({ label: '다음 세그먼트 준비됨', tone: 'ready' });
    expect(getNextGenState('failed')).toMatchObject({ label: '다음 세그먼트 실패', tone: 'failed' });
  });

  it('labels wear and signal indicators', () => {
    expect(getWearLabel('worn')).toBe('Muse 착용 중');
    expect(getWearLabel('uncertain')).toBe('신호 확인 중');
    expect(getWearLabel('off')).toBe('Muse 미착용');
    expect(getSignalLabel(null)).toBe('신호 대기');
    expect(getSignalLabel(0.876)).toBe('신호 88%');
  });

  it('allows playback only when current segment is ready and has audio', () => {
    const readySegment = segment('ready', { audioId: 'audio_ready' });
    const pendingVm = buildAdaptivePlayerViewModel({
      lastAction: null,
      lastSignalScore: null,
      nextGenStatus: 'pending',
      segments: [segment('pending')],
      session: session(segment('pending')),
      wearStatus: 'unknown',
    });
    const readyVm = buildAdaptivePlayerViewModel({
      lastAction: null,
      lastSignalScore: 0.9,
      nextGenStatus: 'ready',
      segments: [readySegment],
      session: session(readySegment),
      wearStatus: 'worn',
    });

    expect(pendingVm.canPlayCurrent).toBe(false);
    expect(pendingVm.nextGenTone).toBe('working');
    expect(readyVm).toMatchObject({
      audioId: 'audio_ready',
      canPlayCurrent: true,
      planet: 'mars',
      wearLabel: 'Muse 착용 중',
    });
  });
});
