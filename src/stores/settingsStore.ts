import { createMMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

export interface SettingsState {
  backendBaseUrl: string;
  hasOnboarded: boolean;
  lightingEnabled: boolean;
  simulationMode: boolean;
  locale: 'ko' | 'en';
  notificationsEnabled: boolean;
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

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      backendBaseUrl: process.env.EXPO_PUBLIC_DEFAULT_BACKEND_URL ?? '',
      hasOnboarded: false,
      lightingEnabled: false,
      simulationMode: false,
      locale: 'ko',
      notificationsEnabled: false,
      setBackendBaseUrl: (url) => set({ backendBaseUrl: normalizeBackendUrl(url) }),
      setHasOnboarded: (value) => set({ hasOnboarded: value }),
      setLightingEnabled: (value) => set({ lightingEnabled: value }),
      setSimulationMode: (value) => set({ simulationMode: value }),
    }),
    {
      name: 'noos.settings.v1',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
