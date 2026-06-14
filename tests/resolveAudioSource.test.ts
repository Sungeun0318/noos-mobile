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

  it('uses signed streamPath before streamUrl when present', () => {
    useSettingsStore.getState().setBackendBaseUrl('http://127.0.0.1:8080/');

    expect(
      resolveAudioSource(
        {
          ...activeSession,
          audio: {
            ...activeSession.audio!,
            streamPath: '/api/mobile/audio/audio-test?exp=123&sig=signed',
            streamUrl: 'https://example.com/legacy.wav',
          },
        },
        99,
      ),
    ).toEqual({ uri: 'http://127.0.0.1:8080/api/mobile/audio/audio-test?exp=123&sig=signed' });
  });

  it('uses absolute signed streamPath as player uri sources', () => {
    expect(
      resolveAudioSource(
        {
          ...activeSession,
          audio: {
            ...activeSession.audio!,
            streamPath: 'https://cdn.example.com/api/mobile/audio/audio-test?exp=123&sig=signed',
          },
        },
        99,
      ),
    ).toEqual({ uri: 'https://cdn.example.com/api/mobile/audio/audio-test?exp=123&sig=signed' });
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

  it('builds a backend audio URL from audioId when streamUrl is absent', () => {
    useSettingsStore.getState().setBackendBaseUrl('http://127.0.0.1:8080/');

    expect(
      resolveAudioSource(
        {
          ...activeSession,
          audio: {
            audioId: 'audio-real',
            durationSec: 30,
          },
        },
        99,
      ),
    ).toEqual({ uri: 'http://127.0.0.1:8080/api/mobile/audio/audio-real' });
  });

  it('falls back to bundled sample audio for audioId without backendBaseUrl', () => {
    expect(
      resolveAudioSource(
        {
          ...activeSession,
          audio: {
            audioId: 'audio-real',
            durationSec: 30,
          },
        },
        99,
      ),
    ).toBe(99);
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
