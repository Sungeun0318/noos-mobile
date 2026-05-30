import type { AudioSource } from 'expo-audio';

import sampleAudioAsset from '../../assets/audio/player-sample.wav';

import type { ActiveSession } from '@/stores/sessionStore';
import { useSettingsStore } from '@/stores/settingsStore';

const remoteAudioUrlPattern = /^https?:\/\//;

export const sampleAudioSource: AudioSource = sampleAudioAsset;

function getBackendBaseUrl() {
  return useSettingsStore.getState().backendBaseUrl.replace(/\/+$/, '');
}

export function resolveAudioSource(
  activeSession: Pick<ActiveSession, 'audio'> | null,
  fallback: AudioSource = sampleAudioSource,
): AudioSource {
  const audio = activeSession?.audio;
  const streamUrl = audio?.streamUrl;

  if (streamUrl && remoteAudioUrlPattern.test(streamUrl)) {
    return { uri: streamUrl };
  }

  if (streamUrl?.startsWith('/')) {
    const backendBaseUrl = getBackendBaseUrl();

    if (backendBaseUrl) {
      return { uri: `${backendBaseUrl}${streamUrl}` };
    }
  }

  if (audio?.audioId) {
    const backendBaseUrl = getBackendBaseUrl();

    if (backendBaseUrl) {
      return { uri: `${backendBaseUrl}/api/mobile/audio/${audio.audioId}` };
    }
  }

  return fallback;
}
