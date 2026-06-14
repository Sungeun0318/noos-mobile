import { describe, expect, it } from 'vitest';

import {
  getAudioLoadErrorCopy,
  getAudioPlaybackStatus,
} from '@/screens/journey/audioPlaybackError';

describe('audioPlaybackError', () => {
  it('separates empty sessions from audio load failures', () => {
    expect(getAudioPlaybackStatus({ hasLoadError: false, hasSession: false })).toBe('empty');
    expect(getAudioPlaybackStatus({ hasLoadError: false, hasSession: true })).toBe('ready');
    expect(getAudioPlaybackStatus({ hasLoadError: true, hasSession: false })).toBe('loadError');
    expect(getAudioPlaybackStatus({ hasLoadError: true, hasSession: true })).toBe('loadError');
  });

  it('returns player-specific retry copy', () => {
    expect(getAudioLoadErrorCopy('single')).toMatchObject({
      retryLabel: '다시 시도',
      title: '음악을 불러올 수 없어요',
    });
    expect(getAudioLoadErrorCopy('adaptive')).toMatchObject({
      retryLabel: '다시 시도',
      title: '현재 음악을 불러올 수 없어요',
    });
  });
});
