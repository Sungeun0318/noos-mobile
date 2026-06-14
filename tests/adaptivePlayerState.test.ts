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
    expect(getSegmentStatusLabel(segment('pending'))).toBe('현재 음악 생성 대기 중');
    expect(getSegmentStatusLabel(segment('generating'))).toBe('현재 음악 생성 중');
    expect(getSegmentStatusLabel(segment('ready', { audioId: 'audio_1' }))).toBe('현재 음악 재생 준비 완료');
    expect(getSegmentStatusLabel(segment('playing', { audioId: 'audio_1' }))).toBe('현재 음악 재생 중');
  });

  it('labels next generation states', () => {
    expect(getNextGenState('idle')).toMatchObject({ label: '다음 음악 대기 중', tone: 'idle' });
    expect(getNextGenState('pending')).toMatchObject({ label: 'EEG 변화 분석 중', tone: 'working' });
    expect(getNextGenState('generating')).toMatchObject({ label: '다음 음악 생성 중', tone: 'working' });
    expect(getNextGenState('ready')).toMatchObject({
      label: '다음 음악 준비 완료 · 현재 곡이 끝나면 자연스럽게 전환됩니다',
      tone: 'ready',
    });
    expect(getNextGenState('failed')).toMatchObject({ label: '다음 음악 생성 실패', tone: 'failed' });
  });

  it('labels wear and signal indicators', () => {
    expect(getWearLabel('worn')).toBe('Muse 착용 중');
    expect(getWearLabel('uncertain')).toBe('Muse 신호 확인 중');
    expect(getWearLabel('off')).toBe('Muse 신호가 약해 세션을 일시 정지했어요');
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
