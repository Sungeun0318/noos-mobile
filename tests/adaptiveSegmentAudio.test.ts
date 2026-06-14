import { beforeEach, describe, expect, it } from 'vitest';

import type { AdaptiveSegmentView } from '@/api/adaptiveTypes';
import { resolveAdaptiveSegmentAudioSource } from '@/screens/journey/adaptiveSegmentAudio';
import { useSettingsStore } from '@/stores/settingsStore';

import { __resetMMKV } from './mocks/react-native-mmkv';

function segment(patch: Partial<AdaptiveSegmentView> = {}): AdaptiveSegmentView {
  return {
    audioId: 'audio_adaptive',
    createdAt: '2026-06-01T00:00:00Z',
    durationSec: 120,
    fallback: false,
    genReadyAt: '2026-06-01T00:01:00Z',
    genStartedAt: '2026-06-01T00:00:10Z',
    index: 0,
    planet: 'Mars',
    playedAt: null,
    segmentId: 1,
    status: 'ready',
    streamPath: '/api/mobile/audio/audio_adaptive?exp=123&sig=signed',
    ...patch,
  };
}

describe('resolveAdaptiveSegmentAudioSource', () => {
  beforeEach(() => {
    __resetMMKV();
    useSettingsStore.getState().setBackendBaseUrl('http://127.0.0.1:8080/');
  });

  it('passes segment streamPath to the shared audio resolver', () => {
    expect(resolveAdaptiveSegmentAudioSource(segment())).toEqual({
      uri: 'http://127.0.0.1:8080/api/mobile/audio/audio_adaptive?exp=123&sig=signed',
    });
  });

  it('falls back to audioId for older adaptive segment responses', () => {
    expect(resolveAdaptiveSegmentAudioSource(segment({ streamPath: null }))).toEqual({
      uri: 'http://127.0.0.1:8080/api/mobile/audio/audio_adaptive',
    });
  });

  it('falls back to the sample source when segment is not ready', () => {
    expect(resolveAdaptiveSegmentAudioSource(segment({ status: 'generating' }))).not.toEqual({
      uri: 'http://127.0.0.1:8080/api/mobile/audio/audio_adaptive?exp=123&sig=signed',
    });
  });
});
