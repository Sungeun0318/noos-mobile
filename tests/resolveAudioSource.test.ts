import { beforeEach, describe, expect, it } from 'vitest';

import { resolveAudioSource } from '@/audio/resolveAudioSource';
import type { ActiveSession } from '@/stores/sessionStore';
import { useSettingsStore } from '@/stores/settingsStore';

import { __resetMMKV } from './mocks/react-native-mmkv';

const activeSession: ActiveSession = {
  audio: {
    audioId: 'audio-test',
    durationSec: 600,
    streamUrl: 'https://example.com/audio.wav',
  },
  durationSec: 600,
  lighting: null,
  planet: 'mars',
  sessionId: 'session-test',
  startedAt: 1_000,
  status: 'playing',
  summary: null,
};

describe('resolveAudioSource', () => {
  beforeEach(() => {
    __resetMMKV();
    useSettingsStore.getState().setBackendBaseUrl('');
  });

  it('uses remote http audio URLs as player uri sources', () => {
    expect(resolveAudioSource(activeSession, 99)).toEqual({ uri: 'https://example.com/audio.wav' });
  });

  it('resolves relative backend audio URLs against backendBaseUrl', () => {
    useSettingsStore.getState().setBackendBaseUrl('http://127.0.0.1:8080/');

    expect(
      resolveAudioSource(
        {
          ...activeSession,
          audio: {
            ...activeSession.audio!,
            streamUrl: '/api/mobile/audio/audio-test',
          },
        },
        99,
      ),
    ).toEqual({ uri: 'http://127.0.0.1:8080/api/mobile/audio/audio-test' });
  });

  it('falls back to bundled sample audio for mock URLs', () => {
    expect(
      resolveAudioSource(
        {
          ...activeSession,
          audio: {
            ...activeSession.audio!,
            streamUrl: 'mock://audio/session-test',
          },
        },
        99,
      ),
    ).toBe(99);
  });

  it('falls back to bundled sample audio when audio is absent', () => {
    expect(resolveAudioSource({ audio: null }, 99)).toBe(99);
  });
});
