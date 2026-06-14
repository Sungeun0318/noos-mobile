import type { AdaptiveSessionResponse } from '@/api/adaptiveTypes';
import type { PendingSession } from '@/stores/sessionStore';
import type { PlanetId } from '@/theme';

export type JourneyResumeTarget =
  | {
      type: 'adaptive';
      sessionId: string;
      label: string;
      description: string;
    }
  | {
      type: 'pending';
      sessionId: string;
      label: string;
      description: string;
      ready: boolean;
    };

export function getJourneyResumeTarget(
  adaptiveSession: AdaptiveSessionResponse | null,
  pendingSessions: PendingSession[],
): JourneyResumeTarget | null {
  if (adaptiveSession?.sessionId && isResumableAdaptiveStatus(adaptiveSession.status)) {
    return {
      description:
        adaptiveSession.status === 'paused'
          ? '일시정지된 적응형 세션으로 돌아갑니다.'
          : '진행 중인 적응형 세션으로 돌아갑니다.',
      label: adaptiveSession.status === 'paused' ? '적응형 세션 다시 시작' : '적응형 세션 이어보기',
      sessionId: adaptiveSession.sessionId,
      type: 'adaptive',
    };
  }

  const pending = [...pendingSessions]
    .sort((a, b) => b.enqueuedAt - a.enqueuedAt)
    .find((session) => session.status !== 'failed');

  if (!pending) {
    return null;
  }

  return {
    description:
      pending.status === 'ready'
        ? '준비된 음악 세션을 바로 재생합니다.'
        : '생성 중인 음악 세션의 진행 화면으로 돌아갑니다.',
    label: pending.status === 'ready' ? '음악 세션 재생하기' : '생성 중인 세션 보기',
    ready: pending.status === 'ready',
    sessionId: pending.sessionId,
    type: 'pending',
  };
}

function isResumableAdaptiveStatus(status: AdaptiveSessionResponse['status']) {
  return status === 'active' || status === 'paused';
}

export function todayJourneyRoute(recommendedPlanet?: PlanetId | null) {
  return {
    params: recommendedPlanet ? { recommendedPlanet } : undefined,
    screen: 'Journey/AdaptiveSetup' as const,
  };
}
