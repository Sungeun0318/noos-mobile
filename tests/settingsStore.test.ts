import { describe, expect, it } from 'vitest';

import { normalizeBackendUrl, useSettingsStore } from '@/stores/settingsStore';

describe('settingsStore', () => {
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
