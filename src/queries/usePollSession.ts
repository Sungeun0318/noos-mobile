import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import type { SessionGetResponse } from '@/api/types';
import { useAppActive } from '@/lib/useAppActive';
import { sessionPollMock } from '@/screens/today/sessionPollMock';
import { useSessionStore, type PendingSession } from '@/stores/sessionStore';

import { qk } from './keys';

const terminalStatuses = new Set(['ready', 'failed', 'completed']);

export function getSessionRefetchInterval(
  data?: Pick<SessionGetResponse, 'createdAt' | 'status'>,
  now = Date.now(),
): number | false {
  if (data && terminalStatuses.has(data.status)) {
    return false;
  }

  const elapsed = now - new Date(data?.createdAt ?? now).getTime();

  if (elapsed < 60_000) {
    return 5_000;
  }

  if (elapsed < 300_000) {
    return 15_000;
  }

  return 60_000;
}

function toStoreProgress(response: SessionGetResponse) {
  if (!response.progress) {
    return null;
  }

  return {
    etaSec: response.progress.etaSec,
    percent: response.progress.percent / 100,
    phase: response.progress.phase,
  };
}

function isTerminal(status: PendingSession['status']) {
  return status === 'ready' || status === 'failed';
}

export function usePollSession(session: PendingSession) {
  const appActive = useAppActive();
  const updatePending = useSessionStore((state) => state.updatePending);
  const query = useQuery({
    enabled: appActive && !isTerminal(session.status),
    networkMode: 'offlineFirst',
    queryFn: () => sessionPollMock(session),
    queryKey: qk.session(session.sessionId),
    refetchInterval: (queryState) => getSessionRefetchInterval(queryState.state.data),
    retry: 2,
  });
  const { data, refetch } = query;

  useEffect(() => {
    if (!data) {
      return;
    }

    updatePending(session.sessionId, {
      error: data.error ?? undefined,
      estimatedReadyInSec: data.progress?.etaSec ?? null,
      progress: toStoreProgress(data),
      status: data.status === 'completed' ? 'ready' : data.status,
    });
  }, [data, session.sessionId, updatePending]);

  useEffect(() => {
    if (appActive && !isTerminal(session.status)) {
      void refetch();
    }
  }, [appActive, refetch, session.status]);

  return query;
}
