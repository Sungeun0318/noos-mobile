import { beforeEach, describe, expect, it } from 'vitest';

import { normalizeBackendUrl, useSettingsStore } from '@/stores/settingsStore';

import { __getMMKVStore } from './mocks/react-native-mmkv';

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      backendBaseUrl: '',
      hasOnboarded: false,
      lightingEnabled: false,
      simulationMode: false,
    });
  });

  it('defaults hasOnboarded to false', () => {
    expect(useSettingsStore.getState().hasOnboarded).toBe(false);
  });

  it('updates hasOnboarded', () => {
    useSettingsStore.getState().setHasOnboarded(true);

    expect(useSettingsStore.getState().hasOnboarded).toBe(true);
  });

  it('persists hasOnboarded in settings storage', () => {
    useSettingsStore.getState().setHasOnboarded(true);

    const persisted = __getMMKVStore('noos.settings.v1').get('noos.settings.v1');

    expect(persisted).toContain('"hasOnboarded":true');
  });

  it('normalizes trailing slashes when setting backendBaseUrl', () => {
    useSettingsStore.getState().setBackendBaseUrl('http://localhost:8080///');

    expect(useSettingsStore.getState().backendBaseUrl).toBe('http://localhost:8080');
  });

  it('keeps lighting disabled by default', () => {
    expect(useSettingsStore.getState().lightingEnabled).toBe(false);
  });

  it('normalizes backend URL helper', () => {
    expect(normalizeBackendUrl(' https://noos.example.com/ ')).toBe('https://noos.example.com');
  });
});
