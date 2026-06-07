import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  currentAdaptiveGatewayMode,
  endAdaptiveSession,
  getAdaptiveSession,
  pauseAdaptiveSession,
  resumeAdaptiveSession,
  startAdaptiveSession,
  submitWindow,
} from '@/api/adaptiveGateway';
import type { AdaptiveSessionStartRequest, AdaptiveWindowSubmitRequest } from '@/api/adaptiveTypes';
import { __resetAdaptiveMock } from '@/api/adaptiveMock';
import { useSettingsStore } from '@/stores/settingsStore';

import { __resetMMKV } from './mocks/react-native-mmkv';

const adaptiveApi = vi.hoisted(() => ({
  end: vi.fn(),
  get: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  start: vi.fn(),
  submitWindow: vi.fn(),
}));

vi.mock('@/api/noosApi', () => ({
  noosApi: {
    adaptive: adaptiveApi,
  },
}));

const startPayload: AdaptiveSessionStartRequest = {
  planetHint: 'Mars',
  seedSource: 'eeg',
};

const windowPayload: AdaptiveWindowSubmitRequest = {
  bands: {
    alpha: 0.5,
    beta: 0.4,
    delta: 0.1,
    gamma: 0.2,
    theta: 0.3,
  },
  dominantBand: 'alpha',
  qualityScore: 0.8,
  sampleCount: 76800,
  sampleRateHz: 256,
  signalOk: true,
  windowDurationSec: 300,
  windowIndex: 0,
  windowStartAt: '2026-06-01T00:00:00Z',
};

describe('adaptiveGateway', () => {
  beforeEach(() => {
    __resetAdaptiveMock();
    __resetMMKV();
    vi.clearAllMocks();
    useSettingsStore.getState().setAdaptiveBackendReal(false);
    useSettingsStore.getState().setSimulationMode(false);
  });

  it('selects real mode when adaptive backend override is enabled', () => {
    expect(currentAdaptiveGatewayMode(true, true)).toBe('real');
    expect(currentAdaptiveGatewayMode(false, true)).toBe('real');
  });

  it('selects mock mode when simulation is enabled without adaptive override', () => {
    expect(currentAdaptiveGatewayMode(true, false)).toBe('mock');
  });

  it('selects real mode when simulation is disabled without adaptive override', () => {
    expect(currentAdaptiveGatewayMode(false, false)).toBe('real');
  });

  it('uses noosApi adaptive endpoints in real mode', async () => {
    adaptiveApi.start.mockResolvedValue({
      seedSegment: {
        index: 0,
        segmentId: 1,
        status: 'pending',
      },
      sessionId: 'adaptive_real',
      status: 'active',
    });
    adaptiveApi.get.mockResolvedValue({
      currentPlanet: 'Mars',
      recentWindows: [],
      segments: [],
      sessionId: 'adaptive_real',
      status: 'active',
    });
    adaptiveApi.submitWindow.mockResolvedValue({
      adaptiveAction: {
        label: '유지',
        reason: 'stable',
        type: 'none',
        volumeScale: 1,
      },
      nextSegment: null,
      sixAxis: {
        corticalArousal: 0.45,
        fatigueRisk: 0.2,
        focusReadiness: 0.5,
        mentalWorkload: 0.25,
        relaxationLevel: 0.6,
        stressLoad: 0.3,
      },
      windowId: 2,
    });
    adaptiveApi.pause.mockResolvedValue({
      endedAt: null,
      pausedAt: '2026-06-01T00:01:00Z',
      pausedReason: 'manual',
      sessionId: 'adaptive_real',
      status: 'paused',
    });
    adaptiveApi.resume.mockResolvedValue({
      endedAt: null,
      pausedAt: null,
      pausedReason: null,
      sessionId: 'adaptive_real',
      status: 'active',
    });
    adaptiveApi.end.mockResolvedValue({
      endedAt: '2026-06-01T00:02:00Z',
      pausedAt: null,
      pausedReason: null,
      sessionId: 'adaptive_real',
      status: 'ended',
    });

    await expect(startAdaptiveSession(startPayload, 'real')).resolves.toMatchObject({
      sessionId: 'adaptive_real',
    });
    await expect(getAdaptiveSession('adaptive_real', 'real')).resolves.toMatchObject({
      sessionId: 'adaptive_real',
    });
    await expect(submitWindow('adaptive_real', windowPayload, 'real')).resolves.toMatchObject({
      windowId: 2,
    });
    await expect(pauseAdaptiveSession('adaptive_real', { reason: 'manual' }, 'real')).resolves.toMatchObject({
      status: 'paused',
    });
    await expect(resumeAdaptiveSession('adaptive_real', 'real')).resolves.toMatchObject({
      status: 'active',
    });
    await expect(endAdaptiveSession('adaptive_real', 'real')).resolves.toMatchObject({
      status: 'ended',
    });

    expect(adaptiveApi.start).toHaveBeenCalledWith(startPayload);
    expect(adaptiveApi.get).toHaveBeenCalledWith('adaptive_real');
    expect(adaptiveApi.submitWindow).toHaveBeenCalledWith('adaptive_real', windowPayload);
    expect(adaptiveApi.pause).toHaveBeenCalledWith('adaptive_real', { reason: 'manual' });
    expect(adaptiveApi.resume).toHaveBeenCalledWith('adaptive_real');
    expect(adaptiveApi.end).toHaveBeenCalledWith('adaptive_real');
  });

  it('uses mock paths in mock mode', async () => {
    const started = await startAdaptiveSession(startPayload, 'mock');

    await expect(getAdaptiveSession(started.sessionId, 'mock')).resolves.toMatchObject({
      sessionId: started.sessionId,
    });
    await expect(submitWindow(started.sessionId, windowPayload, 'mock')).resolves.toMatchObject({
      adaptiveAction: {
        type: 'parameter_adjust',
      },
    });
    await expect(pauseAdaptiveSession(started.sessionId, { reason: 'manual' }, 'mock')).resolves.toMatchObject({
      status: 'paused',
    });
    await expect(resumeAdaptiveSession(started.sessionId, 'mock')).resolves.toMatchObject({
      status: 'active',
    });
    await expect(endAdaptiveSession(started.sessionId, 'mock')).resolves.toMatchObject({
      status: 'ended',
    });

    expect(adaptiveApi.start).not.toHaveBeenCalled();
    expect(adaptiveApi.get).not.toHaveBeenCalled();
    expect(adaptiveApi.submitWindow).not.toHaveBeenCalled();
  });
});
