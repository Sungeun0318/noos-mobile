import type { AudioSource } from 'expo-audio';

import type { AdaptiveSegmentView } from '@/api/adaptiveTypes';
import { resolveAudioSource } from '@/audio/resolveAudioSource';

export function resolveAdaptiveSegmentAudioSource(segment: AdaptiveSegmentView | null): AudioSource {
  if (segment?.status === 'ready' && segment.audioId) {
    return resolveAudioSource({
      audio: {
        audioId: segment.audioId,
        durationSec: segment.durationSec,
        streamPath: segment.streamPath,
      },
    });
  }

  return resolveAudioSource(null);
}
