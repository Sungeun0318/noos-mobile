import { beforeEach, describe, expect, it } from 'vitest';

import { migrateSettings, normalizeBackendUrl, useSettingsStore } from '@/stores/settingsStore';

import { __getMMKVStore } from './mocks/react-native-mmkv';

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      adaptiveBackendReal: false,
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

  it('updates lighting preference', () => {
    useSettingsStore.getState().setLightingEnabled(true);

    expect(useSettingsStore.getState().lightingEnabled).toBe(true);
  });

  it('updates adaptive backend real override', () => {
    useSettingsStore.getState().setAdaptiveBackendReal(true);

    expect(useSettingsStore.getState().adaptiveBackendReal).toBe(true);
  });

  it('persists adaptive backend real override in settings storage', () => {
    useSettingsStore.getState().setAdaptiveBackendReal(true);

    const persisted = __getMMKVStore('noos.settings.v1').get('noos.settings.v1');

    expect(persisted).toContain('"adaptiveBackendReal":true');
  });

  it('normalizes backend URL helper', () => {
    expect(normalizeBackendUrl(' https://noos.example.com/ ')).toBe('https://noos.example.com');
  });

  it('turns lighting on when migrating settings saved before lighting was wired', () => {
    expect(migrateSettings({ hasOnboarded: true, lightingEnabled: false }, 0)).toEqual({
      hasOnboarded: true,
      lightingEnabled: true,
    });
  });

  it('keeps a lighting choice made after the migration', () => {
    expect(migrateSettings({ lightingEnabled: false }, 1)).toEqual({ lightingEnabled: false });
  });
});
