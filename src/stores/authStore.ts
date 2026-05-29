import * as SecureStore from 'expo-secure-store';
import { createMMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { ApiError } from '@/api/client';
import { noosApi } from '@/api/noosApi';
import type { AuthResponse, MobileUser } from '@/api/types';
import { getOrCreateDeviceId } from '@/lib/deviceId';
import { logger } from '@/lib/logger';

export type AuthMode = 'guest' | 'authed';

export interface AuthState {
  mode: AuthMode;
  deviceId: string;
  user: MobileUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  accessExpiresAt: number | null;
  bootstrap(): Promise<void>;
  signup(input: { loginId: string; password: string; displayName: string }): Promise<void>;
  login(input: { loginId: string; password: string }): Promise<void>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
}

const log = logger.create('authStore');
const storage = createMMKV({ id: 'noos.auth.v1' });
const accessTokenKey = 'noos.auth.accessToken';
const refreshTokenKey = 'noos.auth.refreshToken';

const zustandStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => {
    storage.remove(name);
  },
};

function expiresAtFrom(response: AuthResponse) {
  return Date.now() + response.expiresIn * 1000;
}

async function storeTokens(accessToken: string | null, refreshToken: string | null) {
  if (accessToken) {
    await SecureStore.setItemAsync(accessTokenKey, accessToken);
  } else {
    await SecureStore.deleteItemAsync(accessTokenKey);
  }

  if (refreshToken) {
    await SecureStore.setItemAsync(refreshTokenKey, refreshToken);
  } else {
    await SecureStore.deleteItemAsync(refreshTokenKey);
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      mode: 'guest',
      deviceId: '',
      user: null,
      accessToken: null,
      refreshToken: null,
      accessExpiresAt: null,
      async bootstrap() {
        const deviceId = await getOrCreateDeviceId();
        const accessToken = await SecureStore.getItemAsync(accessTokenKey);
        const refreshToken = await SecureStore.getItemAsync(refreshTokenKey);

        set({ deviceId, accessToken, refreshToken });

        if (!accessToken || !refreshToken) {
          set({ mode: 'guest', user: null, accessToken: null, refreshToken: null, accessExpiresAt: null });
          return;
        }

        try {
          const me = await noosApi.auth.me();
          set({
            mode: me.user ? 'authed' : 'guest',
            deviceId: me.deviceId || deviceId,
            user: me.user,
          });
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            try {
              await get().refresh();
              return;
            } catch (refreshError) {
              log.warn('token refresh failed during bootstrap', {
                code: refreshError instanceof ApiError ? refreshError.code : 'UNKNOWN',
              });
            }
          } else {
            log.warn('me check failed during bootstrap', {
              code: error instanceof ApiError ? error.code : 'UNKNOWN',
            });
          }

          await get().logout();
        }
      },
      async signup(input) {
        const deviceId = get().deviceId || (await getOrCreateDeviceId());
        const response = await noosApi.auth.signup({ ...input, claimDeviceId: deviceId });

        await storeTokens(response.accessToken, response.refreshToken ?? get().refreshToken);
        set({
          mode: 'authed',
          deviceId,
          user: response.user,
          accessToken: response.accessToken,
          refreshToken: response.refreshToken ?? get().refreshToken,
          accessExpiresAt: expiresAtFrom(response),
        });
      },
      async login(input) {
        const deviceId = get().deviceId || (await getOrCreateDeviceId());
        const response = await noosApi.auth.login({ ...input, claimDeviceId: deviceId });

        await storeTokens(response.accessToken, response.refreshToken ?? get().refreshToken);
        set({
          mode: 'authed',
          deviceId,
          user: response.user,
          accessToken: response.accessToken,
          refreshToken: response.refreshToken ?? get().refreshToken,
          accessExpiresAt: expiresAtFrom(response),
        });
      },
      async logout() {
        const deviceId = get().deviceId || (await getOrCreateDeviceId());

        if (get().accessToken) {
          noosApi.auth.logout().catch((error: unknown) => {
            log.warn('remote logout failed', {
              code: error instanceof ApiError ? error.code : 'UNKNOWN',
            });
          });
        }

        await storeTokens(null, null);
        set({
          mode: 'guest',
          deviceId,
          user: null,
          accessToken: null,
          refreshToken: null,
          accessExpiresAt: null,
        });
      },
      async refresh() {
        const refreshToken = get().refreshToken;

        if (!refreshToken) {
          throw new ApiError(401, 'NO_REFRESH_TOKEN');
        }

        const response = await noosApi.auth.refresh({ refreshToken });
        const nextRefreshToken = response.refreshToken ?? refreshToken;

        await storeTokens(response.accessToken, nextRefreshToken);
        set({
          mode: 'authed',
          user: response.user,
          accessToken: response.accessToken,
          refreshToken: nextRefreshToken,
          accessExpiresAt: expiresAtFrom(response),
        });
      },
    }),
    {
      name: 'noos.auth.v1',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        user: state.user,
        accessExpiresAt: state.accessExpiresAt,
      }),
    },
  ),
);
