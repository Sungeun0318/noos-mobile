import type { AudioSource } from 'expo-audio';

import sampleAudioAsset from '../../assets/audio/player-sample.wav';

import type { ActiveSession } from '@/stores/sessionStore';

const remoteAudioUrlPattern = /^https?:\/\//;

export const sampleAudioSource: AudioSource = sampleAudioAsset;

export function resolveAudioSource(
  activeSession: Pick<ActiveSession, 'audio'> | null,
  fallback: AudioSource = sampleAudioSource,
): AudioSource {
  const streamUrl = activeSession?.audio?.streamUrl;

  if (streamUrl && remoteAudioUrlPattern.test(streamUrl)) {
    return { uri: streamUrl };
  }

  // TODO: use real streamUrl (noosApi.audio.streamUrl) once backend wired.
  return fallback;
}
