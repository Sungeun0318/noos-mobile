export type AudioPlaybackSurface = 'single' | 'adaptive';
export type AudioPlaybackStatus = 'empty' | 'loadError' | 'ready';

export interface AudioLoadErrorCopy {
  body: string;
  retryLabel: string;
  title: string;
}

export function getAudioPlaybackStatus({
  hasLoadError,
  hasSession,
}: {
  hasLoadError: boolean;
  hasSession: boolean;
}): AudioPlaybackStatus {
  if (hasLoadError) {
    return 'loadError';
  }

  return hasSession ? 'ready' : 'empty';
}

export function getAudioLoadErrorCopy(surface: AudioPlaybackSurface): AudioLoadErrorCopy {
  if (surface === 'adaptive') {
    return {
      body: '서명 URL이 만료됐거나 네트워크가 불안정할 수 있어요. 세션 상태를 새로 확인한 뒤 다시 불러올게요.',
      retryLabel: '다시 시도',
      title: '현재 음악을 불러올 수 없어요',
    };
  }

  return {
    body: '연결 상태를 확인하고 다시 시도해 주세요. 서명 URL이 만료된 경우 새 재생 주소를 다시 받아옵니다.',
    retryLabel: '다시 시도',
    title: '음악을 불러올 수 없어요',
  };
}
