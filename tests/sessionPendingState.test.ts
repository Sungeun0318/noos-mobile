import { describe, expect, it } from 'vitest';

import {
  formatPendingEta,
  getSessionPendingViewState,
} from '@/screens/journey/sessionPendingState';
import type { PendingSession } from '@/stores/sessionStore';

const baseSession: PendingSession = {
  durationSec: 600,
  enqueuedAt: 1_000,
  estimatedReadyInSec: 480,
  planet: 'venus',
  progress: {
    etaSec: 480,
    percent: 0,
    phase: 'queued',
  },
  sessionId: 'session-pending',
  status: 'queued',
};

describe('sessionPendingState', () => {
  it('formats ETA by rounding up minutes', () => {
    expect(formatPendingEta(61)).toBe('약 2분 남음');
    expect(formatPendingEta(0)).toBeNull();
    expect(formatPendingEta(null)).toBeNull();
  });

  it('maps queued state to preparation copy', () => {
    expect(getSessionPendingViewState(baseSession)).toMatchObject({
      progress: 0,
      showLongRunningHint: true,
      showPlay: false,
      title: '세션 준비 중',
    });
  });

  it('maps generating state with progress and ETA', () => {
    expect(
      getSessionPendingViewState({
        ...baseSession,
        progress: {
          etaSec: 120,
          percent: 0.42,
          phase: 'generating',
        },
        status: 'generating',
      }),
    ).toMatchObject({
      etaLabel: '약 2분 남음',
      progress: 0.42,
      showLongRunningHint: true,
      title: '세션 생성 중',
    });
  });

  it('maps ready state to playable CTA', () => {
    expect(getSessionPendingViewState({ ...baseSession, status: 'ready' })).toMatchObject({
      progress: 1,
      showLongRunningHint: false,
      showPlay: true,
      title: '준비 완료',
    });
  });

  it('maps failed state to retry guidance', () => {
    expect(
      getSessionPendingViewState({
        ...baseSession,
        error: {
          code: 'GENERATION_FAILED',
          message: 'dummy failure',
        },
        status: 'failed',
      }),
    ).toMatchObject({
      body: 'dummy failure',
      progress: 1,
      showPlay: false,
      title: '생성을 완료하지 못했어요',
    });
  });
});
