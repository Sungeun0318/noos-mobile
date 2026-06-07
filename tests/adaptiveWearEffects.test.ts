import { describe, expect, it, vi } from 'vitest';

import { applyAdaptiveWearTransition } from '@/adaptive/adaptiveWearEffects';

describe('applyAdaptiveWearTransition', () => {
  it('pauses session, audio, and capture once when wear status becomes off', async () => {
    const setAutoPaused = vi.fn();
    const pauseAudio = vi.fn();
    const stopCapture = vi.fn();
    const pauseSession = vi.fn(async () => ({ status: 'paused' }));

    await applyAdaptiveWearTransition({
      autoPaused: false,
      pauseAudio,
      pauseSession,
      resumeSession: vi.fn(),
      sessionId: 'adaptive_1',
      setAutoPaused,
      startCapture: vi.fn(),
      stopCapture,
      wearStatus: 'off',
    });

    expect(pauseAudio).toHaveBeenCalledTimes(1);
    expect(stopCapture).toHaveBeenCalledTimes(1);
    expect(setAutoPaused).toHaveBeenCalledWith(true);
    expect(pauseSession).toHaveBeenCalledWith('adaptive_1', { reason: 'wear_off' });

    await applyAdaptiveWearTransition({
      autoPaused: true,
      pauseAudio,
      pauseSession,
      resumeSession: vi.fn(),
      sessionId: 'adaptive_1',
      setAutoPaused,
      startCapture: vi.fn(),
      stopCapture,
      wearStatus: 'off',
    });

    expect(pauseSession).toHaveBeenCalledTimes(1);
  });

  it('resumes session and capture when a previously auto-paused session is worn again', async () => {
    const setAutoPaused = vi.fn();
    const resumeSession = vi.fn(async () => ({ status: 'active' }));
    const startCapture = vi.fn();

    await applyAdaptiveWearTransition({
      autoPaused: true,
      pauseAudio: vi.fn(),
      pauseSession: vi.fn(),
      resumeSession,
      sessionId: 'adaptive_1',
      setAutoPaused,
      startCapture,
      stopCapture: vi.fn(),
      wearStatus: 'worn',
    });

    expect(resumeSession).toHaveBeenCalledWith('adaptive_1');
    expect(startCapture).toHaveBeenCalledTimes(1);
    expect(setAutoPaused).toHaveBeenCalledWith(false);
  });

  it('does nothing for worn when the session was not auto-paused', async () => {
    const resumeSession = vi.fn();

    await applyAdaptiveWearTransition({
      autoPaused: false,
      pauseAudio: vi.fn(),
      pauseSession: vi.fn(),
      resumeSession,
      sessionId: 'adaptive_1',
      setAutoPaused: vi.fn(),
      startCapture: vi.fn(),
      stopCapture: vi.fn(),
      wearStatus: 'worn',
    });

    expect(resumeSession).not.toHaveBeenCalled();
  });
});
