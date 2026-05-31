import type { PendingSession } from '@/stores/sessionStore';

export interface SessionPendingViewState {
  title: string;
  body: string;
  etaLabel: string | null;
  progress: number;
  showPlay: boolean;
  showLongRunningHint: boolean;
}

export function formatPendingEta(etaSec: number | null | undefined) {
  if (!etaSec || etaSec <= 0) {
    return null;
  }

  return `약 ${Math.ceil(etaSec / 60)}분 남음`;
}

export function getSessionPendingViewState(session: PendingSession): SessionPendingViewState {
  const etaSec = session.progress?.etaSec ?? session.estimatedReadyInSec;

  if (session.status === 'ready') {
    return {
      body: '지금 바로 재생할 수 있어요.',
      etaLabel: null,
      progress: 1,
      showLongRunningHint: false,
      showPlay: true,
      title: '준비 완료',
    };
  }

  if (session.status === 'failed') {
    return {
      body: session.error?.message ?? '생성에 실패했어요. 행성 선택에서 다시 시도해 주세요.',
      etaLabel: null,
      progress: 1,
      showLongRunningHint: false,
      showPlay: false,
      title: '생성을 완료하지 못했어요',
    };
  }

  if (session.status === 'generating') {
    return {
      body: '행성 사운드를 만들고 있어요. 앱을 떠나도 Today에서 계속 확인할 수 있어요.',
      etaLabel: formatPendingEta(etaSec),
      progress: session.progress?.percent ?? 0.35,
      showLongRunningHint: true,
      showPlay: false,
      title: '세션 생성 중',
    };
  }

  return {
    body: '생성 대기열에 들어갔어요. 곧 사운드 생성을 시작해요.',
    etaLabel: formatPendingEta(etaSec),
    progress: session.progress?.percent ?? 0,
    showLongRunningHint: true,
    showPlay: false,
    title: '세션 준비 중',
  };
}
