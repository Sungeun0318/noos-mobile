import { describe, expect, it } from 'vitest';

import type { AdaptiveSessionResponse } from '@/api/adaptiveTypes';
import {
  getJourneyResumeTarget,
  todayJourneyRoute,
} from '@/screens/journey/journeyHomeLogic';
import type { PendingSession } from '@/stores/sessionStore';

function adaptiveSession(
  status: AdaptiveSessionResponse['status'],
): AdaptiveSessionResponse {
  return {
    createdAt: '2026-06-01T00:00:00.000Z',
    currentPlanet: 'Neptune',
    currentSegment: null,
    endedAt: null,
    initialPlanet: 'Neptune',
    nextSegment: null,
    pausedAt: null,
    pausedReason: status === 'paused' ? 'wear_off' : null,
    recentWindows: [],
    seedSource: 'eeg',
    segments: [],
    sessionId: `adaptive-${status}`,
    startedAt: '2026-06-01T00:00:00.000Z',
    status,
  };
}

function pendingSession(
  sessionId: string,
  status: PendingSession['status'],
  enqueuedAt: number,
): PendingSession {
  return {
    durationSec: 120,
    enqueuedAt,
    estimatedReadyInSec: null,
    planet: 'mars',
    progress: null,
    sessionId,
    status,
  };
}

describe('journeyHomeLogic', () => {
  it('shows adaptive resume first when an adaptive session is active', () => {
    const target = getJourneyResumeTarget(adaptiveSession('active'), [
      pendingSession('pending-ready', 'ready', 2),
    ]);

    expect(target).toEqual({
      description: '진행 중인 적응형 세션으로 돌아갑니다.',
      label: '적응형 세션 이어보기',
      sessionId: 'adaptive-active',
      type: 'adaptive',
    });
  });

  it('shows paused adaptive sessions as resumable', () => {
    const target = getJourneyResumeTarget(adaptiveSession('paused'), []);

    expect(target?.type).toBe('adaptive');
    expect(target?.label).toBe('적응형 세션 다시 시작');
  });

  it('ignores ended adaptive sessions and picks the latest non-failed pending session', () => {
    const target = getJourneyResumeTarget(adaptiveSession('ended'), [
      pendingSession('older-ready', 'ready', 1),
      pendingSession('newer-failed', 'failed', 3),
      pendingSession('newer-generating', 'generating', 2),
    ]);

    expect(target).toEqual({
      description: '생성 중인 음악 세션의 진행 화면으로 돌아갑니다.',
      label: '생성 중인 세션 보기',
      ready: false,
      sessionId: 'newer-generating',
      type: 'pending',
    });
  });

  it('marks ready pending sessions as playable', () => {
    const target = getJourneyResumeTarget(null, [pendingSession('ready-session', 'ready', 1)]);

    expect(target).toEqual({
      description: '준비된 음악 세션을 바로 재생합니다.',
      label: '음악 세션 재생하기',
      ready: true,
      sessionId: 'ready-session',
      type: 'pending',
    });
  });

  it('returns no resume target when nothing is active or pending', () => {
    expect(getJourneyResumeTarget(null, [])).toBeNull();
  });

  it('builds Today adaptive CTA route params only when a recommended planet exists', () => {
    expect(todayJourneyRoute('saturn')).toEqual({
      params: { recommendedPlanet: 'saturn' },
      screen: 'Journey/AdaptiveSetup',
    });
    expect(todayJourneyRoute(null)).toEqual({
      params: undefined,
      screen: 'Journey/AdaptiveSetup',
    });
  });
});
