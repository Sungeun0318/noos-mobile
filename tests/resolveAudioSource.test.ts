import { describe, expect, it } from 'vitest';

import { resolveAudioSource } from '@/audio/resolveAudioSource';
import type { ActiveSession } from '@/stores/sessionStore';

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
  it('uses remote http audio URLs as player uri sources', () => {
    expect(resolveAudioSource(activeSession, 99)).toEqual({ uri: 'https://example.com/audio.wav' });
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
