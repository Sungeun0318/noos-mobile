import { request, requestWithBaseUrl } from './client';
import type {
  AuthResponse,
  EnqueueSessionRequest,
  EnqueueSessionResponse,
  MeResponse,
  MobileHealthResponse,
  SessionGetResponse,
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
