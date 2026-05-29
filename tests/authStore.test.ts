import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthResponse, MeResponse } from '@/api/types';

import { __resetMMKV } from './mocks/react-native-mmkv';

const secureStore = vi.hoisted(() => new Map<string, string>());
const authApi = vi.hoisted(() => ({
  me: vi.fn<() => Promise<MeResponse>>(),
  refresh: vi.fn<(body: { refreshToken: string }) => Promise<AuthResponse>>(),
  logout: vi.fn<() => Promise<{ ok: true }>>(),
  signup: vi.fn(),
  login: vi.fn(),
  claimAnonymous: vi.fn(),
}));
const randomUUID = vi.hoisted(() => vi.fn(() => 'device-uuid'));

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn((key: string) => Promise.resolve(secureStore.get(key) ?? null)),
  setItemAsync: vi.fn((key: string, value: string) => {
    secureStore.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: vi.fn((key: string) => {
    secureStore.delete(key);
    return Promise.resolve();
  }),
}));

vi.mock('expo-crypto', () => ({
  randomUUID,
}));

vi.mock('@/api/noosApi', () => ({
  noosApi: {
    auth: authApi,
  },
}));

const user = {
  userId: 42,
  loginId: 'tester',
  displayName: 'Tester',
};

async function loadStore() {
  const { useAuthStore } = await import('@/stores/authStore');

  return useAuthStore;
}

async function loadApiError() {
  const { ApiError } = await import('@/api/client');

  return ApiError;
}

describe('authStore bootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    secureStore.clear();
    __resetMMKV();
    authApi.logout.mockResolvedValue({ ok: true });
  });

  it('clears auth state to guest when tokens are missing', async () => {
    const useAuthStore = await loadStore();

    await useAuthStore.getState().bootstrap();

    expect(useAuthStore.getState()).toMatchObject({
      mode: 'guest',
      user: null,
      accessToken: null,
      refreshToken: null,
      accessExpiresAt: null,
    });
    expect(authApi.me).not.toHaveBeenCalled();
  });

  it('sets authed mode when tokens exist and me succeeds with a user', async () => {
    secureStore.set('deviceId', 'dev_existing');
    secureStore.set('noos.auth.accessToken', 'dummy-access');
    secureStore.set('noos.auth.refreshToken', 'dummy-refresh');
    authApi.me.mockResolvedValue({
      mode: 'authed',
      deviceId: 'dev_existing',
      user,
    });

    const useAuthStore = await loadStore();

    await useAuthStore.getState().bootstrap();

    expect(useAuthStore.getState()).toMatchObject({
      mode: 'authed',
      deviceId: 'dev_existing',
      user,
      accessToken: 'dummy-access',
      refreshToken: 'dummy-refresh',
    });
  });

  it('tries refresh once when me returns 401 and keeps authed state on success', async () => {
    const ApiError = await loadApiError();
    secureStore.set('deviceId', 'dev_existing');
    secureStore.set('noos.auth.accessToken', 'expired-access');
    secureStore.set('noos.auth.refreshToken', 'dummy-refresh');
    authApi.me.mockRejectedValue(new ApiError(401, 'UNAUTHORIZED'));
    authApi.refresh.mockResolvedValue({
      user,
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresIn: 900,
    });

    const useAuthStore = await loadStore();

    await useAuthStore.getState().bootstrap();

    expect(authApi.refresh).toHaveBeenCalledTimes(1);
    expect(authApi.refresh).toHaveBeenCalledWith({ refreshToken: 'dummy-refresh' });
    expect(useAuthStore.getState()).toMatchObject({
      mode: 'authed',
      user,
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
    expect(secureStore.get('noos.auth.accessToken')).toBe('new-access');
    expect(secureStore.get('noos.auth.refreshToken')).toBe('new-refresh');
  });

  it('preserves tokens and continues as guest for non-401 me failures', async () => {
    secureStore.set('deviceId', 'dev_existing');
    secureStore.set('noos.auth.accessToken', 'dummy-access');
    secureStore.set('noos.auth.refreshToken', 'dummy-refresh');
    authApi.me.mockRejectedValue(new Error('NETWORK_ERROR'));

    const useAuthStore = await loadStore();

    await useAuthStore.getState().bootstrap();

    expect(authApi.refresh).not.toHaveBeenCalled();
    expect(authApi.logout).not.toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({
      mode: 'guest',
      user: null,
      accessToken: 'dummy-access',
      refreshToken: 'dummy-refresh',
    });
    expect(secureStore.get('noos.auth.accessToken')).toBe('dummy-access');
    expect(secureStore.get('noos.auth.refreshToken')).toBe('dummy-refresh');
  });

  it('logs out and deletes tokens when refresh fails after a 401 me response', async () => {
    const ApiError = await loadApiError();
    secureStore.set('deviceId', 'dev_existing');
    secureStore.set('noos.auth.accessToken', 'expired-access');
    secureStore.set('noos.auth.refreshToken', 'dummy-refresh');
    authApi.me.mockRejectedValue(new ApiError(401, 'UNAUTHORIZED'));
    authApi.refresh.mockRejectedValue(new ApiError(401, 'UNAUTHORIZED'));

    const useAuthStore = await loadStore();

    await useAuthStore.getState().bootstrap();

    expect(authApi.refresh).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({
      mode: 'guest',
      user: null,
      accessToken: null,
      refreshToken: null,
      accessExpiresAt: null,
    });
    expect(secureStore.has('noos.auth.accessToken')).toBe(false);
    expect(secureStore.has('noos.auth.refreshToken')).toBe(false);
  });
});
