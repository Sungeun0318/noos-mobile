import { request, requestWithBaseUrl } from './client';
import type {
  AdaptiveSessionResponse,
  AdaptiveSessionStartRequest,
  AdaptiveSessionStartResponse,
  AdaptiveSessionStatusResponse,
  AdaptiveWindowSubmitRequest,
  AdaptiveWindowSubmitResponse,
  PauseAdaptiveSessionRequest,
} from './adaptiveTypes';
import type {
  AuthResponse,
  EnqueueSessionRequest,
  EnqueueSessionResponse,
  FeedbackRequest,
  FeedbackResponse,
  MeResponse,
  MobileHealthResponse,
  SessionGetResponse,
  SessionListResponse,
} from './types';

export const noosApi = {
  health: () => request<MobileHealthResponse>('/api/mobile/health'),
  healthWithBaseUrl: (baseUrl: string) =>
    requestWithBaseUrl<MobileHealthResponse>(baseUrl, '/api/mobile/health'),
  sessions: {
    create: (body: EnqueueSessionRequest) =>
      request<EnqueueSessionResponse>('/api/mobile/sessions', {
        method: 'POST',
        body: JSON.stringify(body),
        timeoutMs: 15_000,
      }),
    get: (id: string) => request<SessionGetResponse>(`/api/mobile/sessions/${id}`),
    feedback: (id: string, body: FeedbackRequest) =>
      request<FeedbackResponse>(`/api/mobile/sessions/${id}/feedback`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    list: (params: { cursor?: string | null; limit?: number; status?: string } = {}) => {
      const query = new URLSearchParams();

      if (params.cursor) {
        query.set('cursor', params.cursor);
      }

      if (params.limit) {
        query.set('limit', String(params.limit));
      }

      if (params.status) {
        query.set('status', params.status);
      }

      const queryString = query.toString();

      return request<SessionListResponse>(`/api/mobile/sessions${queryString ? `?${queryString}` : ''}`);
    },
  },
  adaptive: {
    start: (body: AdaptiveSessionStartRequest) =>
      request<AdaptiveSessionStartResponse>('/api/mobile/adaptive/sessions/start', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    get: (id: string) => request<AdaptiveSessionResponse>(`/api/mobile/adaptive/sessions/${id}`),
    submitWindow: (id: string, body: AdaptiveWindowSubmitRequest) =>
      request<AdaptiveWindowSubmitResponse>(`/api/mobile/adaptive/sessions/${id}/windows`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    pause: (id: string, body: PauseAdaptiveSessionRequest = {}) =>
      request<AdaptiveSessionStatusResponse>(`/api/mobile/adaptive/sessions/${id}/pause`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    resume: (id: string) =>
      request<AdaptiveSessionStatusResponse>(`/api/mobile/adaptive/sessions/${id}/resume`, {
        method: 'POST',
      }),
    end: (id: string) =>
      request<AdaptiveSessionStatusResponse>(`/api/mobile/adaptive/sessions/${id}/end`, {
        method: 'POST',
      }),
  },
  auth: {
    signup: (body: {
      loginId: string;
      password: string;
      displayName: string;
      claimDeviceId?: string;
    }) =>
      request<AuthResponse>('/api/mobile/auth/signup', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    login: (body: { loginId: string; password: string; claimDeviceId?: string }) =>
      request<AuthResponse>('/api/mobile/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    refresh: (body: { refreshToken: string }) =>
      request<AuthResponse>('/api/mobile/auth/refresh', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    logout: () => request<{ ok: true }>('/api/mobile/auth/logout', { method: 'POST' }),
    me: () => request<MeResponse>('/api/mobile/me'),
    claimAnonymous: (body: { deviceId: string }) =>
      request<{ ok: true; claimedCount: unknown }>('/api/mobile/auth/claim-anonymous', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },
};
