import { Platform } from 'react-native';

import { appVersion } from '@/lib/appInfo';
import { getOrCreateDeviceId } from '@/lib/deviceId';
import { useSettingsStore } from '@/stores/settingsStore';

const defaultTimeoutMs = 15_000;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public detail?: string,
  ) {
    super(detail || code);
    this.name = 'ApiError';
  }
}

export type RequestOptions = RequestInit & {
  baseUrl?: string;
  timeoutMs?: number;
  accessToken?: string | null;
};

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, '')}${path}`;
}

function parseApiError(status: number, body: unknown, fallback: string) {
  if (
    body &&
    typeof body === 'object' &&
    'error' in body &&
    body.error &&
    typeof body.error === 'object'
  ) {
    const error = body.error as { code?: unknown; message?: unknown };

    return new ApiError(
      status,
      typeof error.code === 'string' ? error.code : 'HTTP_ERROR',
      typeof error.message === 'string' ? error.message : fallback,
    );
  }

  return new ApiError(status, 'HTTP_ERROR', fallback);
}

async function readBody(response: Response) {
  const text = await response.text();

  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
  const baseUrl = init.baseUrl ?? useSettingsStore.getState().backendBaseUrl;

  if (!baseUrl) {
    throw new ApiError(0, 'NO_BASE_URL');
  }

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), init.timeoutMs ?? defaultTimeoutMs);
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  headers.set('x-device-id', getOrCreateDeviceId());
  headers.set('x-app-platform', Platform.OS);
  headers.set('x-app-version', appVersion);

  if (init.accessToken) {
    headers.set('authorization', `Bearer ${init.accessToken}`);
  }

  try {
    const response = await fetch(joinUrl(baseUrl, path), {
      ...init,
      headers,
      signal: ctrl.signal,
    });
    const body = await readBody(response);

    if (!response.ok) {
      throw parseApiError(response.status, body, response.statusText);
    }

    return body as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(0, 'TIMEOUT', 'request timed out');
    }

    throw new ApiError(0, 'NETWORK_ERROR', error instanceof Error ? error.message : undefined);
  } finally {
    clearTimeout(timeout);
  }
}

export function requestWithBaseUrl<T>(baseUrl: string, path: string, init: RequestOptions = {}) {
  return request<T>(path, { ...init, baseUrl });
}
