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
  const streamPath = audio?.streamPath;
  const streamUrl = audio?.streamUrl;

  if (streamPath && remoteAudioUrlPattern.test(streamPath)) {
    return { uri: streamPath };
  }

  if (streamPath?.startsWith('/')) {
    const backendBaseUrl = getBackendBaseUrl();

    if (backendBaseUrl) {
      return { uri: `${backendBaseUrl}${streamPath}` };
    }
  }

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
