import { noosApi } from '@/api/noosApi';
import { currentSessionGatewayMode, type SessionGatewayMode } from '@/api/sessionGateway';
import {
  historyFromSessionGetResponse,
  historyFromSessionListItem,
} from '@/screens/history/historyTransforms';
import { listHistorySessions, useHistoryStore, type HistorySession } from '@/stores/historyStore';

function dedupeSessions(sessions: HistorySession[]) {
  return Array.from(new Map(sessions.map((session) => [session.sessionId, session])).values());
}

export async function listHistory(
  mode: SessionGatewayMode = currentSessionGatewayMode(),
): Promise<HistorySession[]> {
  if (mode === 'mock') {
    return listHistorySessions(useHistoryStore.getState().sessions);
  }

  // TODO: useInfiniteQuery(noosApi.sessions.list) with cursor pagination when history grows.
  const response = await noosApi.sessions.list({ limit: 20, status: 'ready,completed' });

  return dedupeSessions(response.items.map(historyFromSessionListItem));
}

export async function getHistory(
  sessionId: string,
  mode: SessionGatewayMode = currentSessionGatewayMode(),
): Promise<HistorySession | null> {
  if (mode === 'mock') {
    return useHistoryStore.getState().getById(sessionId);
  }

  // TODO: replace with dedicated history detail endpoint if server shape diverges.
  return historyFromSessionGetResponse(await noosApi.sessions.get(sessionId));
}
