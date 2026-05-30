import type {
  EnqueueSessionRequest,
  EnqueueSessionResponse,
  FeedbackRequest,
  FeedbackResponse,
  SessionGetResponse,
} from '@/api/types';
import { enqueueMock } from '@/screens/journey/enqueueMock';
import { feedbackMock } from '@/screens/journey/feedbackMock';
import { sessionPollMock } from '@/screens/today/sessionPollMock';
import type { PendingSession } from '@/stores/sessionStore';
import { useSettingsStore } from '@/stores/settingsStore';

export type SessionGatewayMode = 'mock' | 'real';

export function currentSessionGatewayMode(simulationMode = useSettingsStore.getState().simulationMode) {
  return simulationMode ? 'mock' : 'real';
}

export async function createSession(
  payload: EnqueueSessionRequest,
  mode: SessionGatewayMode = currentSessionGatewayMode(),
): Promise<EnqueueSessionResponse> {
  if (mode === 'mock') {
    return enqueueMock(payload);
  }

  const { noosApi } = await import('@/api/noosApi');

  return noosApi.sessions.create(payload);
}

export async function getSession(
  session: PendingSession,
  mode: SessionGatewayMode = currentSessionGatewayMode(),
): Promise<SessionGetResponse> {
  if (mode === 'mock') {
    return sessionPollMock(session);
  }

  const { noosApi } = await import('@/api/noosApi');

  return noosApi.sessions.get(session.sessionId);
}

export async function submitFeedback(
  sessionId: string,
  body: FeedbackRequest,
  mode: SessionGatewayMode = currentSessionGatewayMode(),
): Promise<FeedbackResponse> {
  if (mode === 'mock') {
    return feedbackMock(sessionId, body);
  }

  const { noosApi } = await import('@/api/noosApi');

  return noosApi.sessions.feedback(sessionId, body);
}
