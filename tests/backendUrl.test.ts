import { describe, expect, it } from 'vitest';

import {
  backendUrlPresets,
  isLocalhostUrl,
  normalizeDraftBackendUrl,
} from '@/screens/settings/backendUrlUtils';

describe('Backend URL helpers', () => {
  it('removes trailing slashes', () => {
    expect(normalizeDraftBackendUrl('http://192.168.1.42:8080//')).toBe(
      'http://192.168.1.42:8080',
    );
  });

  it('detects localhost URLs', () => {
    expect(isLocalhostUrl('http://localhost:8080')).toBe(true);
    expect(isLocalhostUrl('http://127.0.0.1:8080')).toBe(true);
    expect(isLocalhostUrl('http://192.168.1.42:8080')).toBe(false);
  });

  it('keeps the required preset candidates', () => {
    expect(backendUrlPresets).toContain('http://localhost:8080');
    expect(backendUrlPresets).toContain('http://192.168.1.42:8080');
    expect(backendUrlPresets).toContain('https://noos.example.com');
  });
});
