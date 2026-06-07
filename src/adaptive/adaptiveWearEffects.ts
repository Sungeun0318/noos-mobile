import type { AdaptiveWearStatus, PauseAdaptiveSessionRequest } from '@/api/adaptiveTypes';

export interface AdaptiveWearTransitionOptions {
  sessionId: string;
  wearStatus: AdaptiveWearStatus;
  autoPaused: boolean;
  setAutoPaused(value: boolean): void;
  pauseAudio(): void;
  stopCapture(): void;
  startCapture(): void;
  pauseSession(sessionId: string, payload: PauseAdaptiveSessionRequest): Promise<unknown>;
  resumeSession(sessionId: string): Promise<unknown>;
}

export async function applyAdaptiveWearTransition({
  autoPaused,
  pauseAudio,
  pauseSession,
  resumeSession,
  sessionId,
  setAutoPaused,
  startCapture,
  stopCapture,
  wearStatus,
}: AdaptiveWearTransitionOptions) {
  if (wearStatus === 'off' && !autoPaused) {
    pauseAudio();
    stopCapture();
    setAutoPaused(true);
    await pauseSession(sessionId, { reason: 'wear_off' });
    return;
  }

  if (wearStatus === 'worn' && autoPaused) {
    await resumeSession(sessionId);
    startCapture();
    setAutoPaused(false);
  }
}
