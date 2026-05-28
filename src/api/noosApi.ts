import { request, requestWithBaseUrl } from './client';
import type { MobileHealthResponse } from './types';

export const noosApi = {
  health: () => request<MobileHealthResponse>('/api/mobile/health'),
  healthWithBaseUrl: (baseUrl: string) =>
    requestWithBaseUrl<MobileHealthResponse>(baseUrl, '/api/mobile/health'),
};
