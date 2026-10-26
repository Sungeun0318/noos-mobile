import { createMMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

export interface SettingsState {
  adaptiveBackendReal: boolean;
  backendBaseUrl: string;
  hasOnboarded: boolean;
  lightingEnabled: boolean;
  simulationMode: boolean;
  locale: 'ko' | 'en';
  notificationsEnabled: boolean;
  setAdaptiveBackendReal(value: boolean): void;
  setBackendBaseUrl(url: string): void;
  setHasOnboarded(value: boolean): void;
  setLightingEnabled(value: boolean): void;
  setSimulationMode(value: boolean): void;
}

const storage = createMMKV({ id: 'noos.settings.v1' });

const zustandStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => {
    storage.remove(name);
  },
};

export function normalizeBackendUrl(url: string) {
  return url.trim().replace(/\/+$/, '');
}

// v0 은 조명 UI 가 막혀 있던 시절(DEC-011)이라 저장된 lightingEnabled=false 는 사용자가 고른 값이 아니다.
export function migrateSettings(persisted: unknown, version: number) {
  const state = (persisted ?? {}) as Partial<SettingsState>;

  if (version < 1) {
    return { ...state, lightingEnabled: true };
  }

  return state;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      adaptiveBackendReal: false,
      backendBaseUrl: process.env.EXPO_PUBLIC_DEFAULT_BACKEND_URL ?? '',
      hasOnboarded: false,
      lightingEnabled: true,
      simulationMode: false,
      locale: 'ko',
      notificationsEnabled: false,
      setAdaptiveBackendReal: (value) => set({ adaptiveBackendReal: value }),
      setBackendBaseUrl: (url) => set({ backendBaseUrl: normalizeBackendUrl(url) }),
      setHasOnboarded: (value) => set({ hasOnboarded: value }),
      setLightingEnabled: (value) => set({ lightingEnabled: value }),
      setSimulationMode: (value) => set({ simulationMode: value }),
    }),
    {
      migrate: (persisted, version) => migrateSettings(persisted, version) as SettingsState,
      name: 'noos.settings.v1',
      storage: createJSONStorage(() => zustandStorage),
      version: 1,
    },
  ),
);
