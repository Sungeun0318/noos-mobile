import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createSession, currentSessionGatewayMode, getSession, submitFeedback } from '@/api/sessionGateway';
import type { EnqueueSessionRequest, FeedbackRequest } from '@/api/types';
import type { PendingSession } from '@/stores/sessionStore';
import { useSettingsStore } from '@/stores/settingsStore';

import { __resetMMKV } from './mocks/react-native-mmkv';

const sessionsApi = vi.hoisted(() => ({
  create: vi.fn(),
  feedback: vi.fn(),
  get: vi.fn(),
}));

vi.mock('@/api/noosApi', () => ({
  noosApi: {
    sessions: sessionsApi,
  },
}));

const payload: EnqueueSessionRequest = {
  durationSec: 600,
  idempotencyKey: 'req_test',
  lightingEnabled: false,
  planet: 'Mars',
};

const pending: PendingSession = {
  durationSec: 600,
  enqueuedAt: Date.now(),
  estimatedReadyInSec: 30,
  planet: 'mars',
  progress: null,
  sessionId: 'session_test',
  status: 'queued',
};

const feedbackPayload: FeedbackRequest = {
  focusResult: 0.75,
  lightingFit: 0.5,
  memo: 'ok',
  musicFit: 0.8,
};

describe('sessionGateway', () => {
  beforeEach(() => {
    __resetMMKV();
    vi.clearAllMocks();
    useSettingsStore.getState().setSimulationMode(false);
  });

  it('selects real mode when simulationMode is false', () => {
    expect(currentSessionGatewayMode(false)).toBe('real');
    expect(currentSessionGatewayMode(true)).toBe('mock');
  });

  it('uses noosApi sessions in real mode', async () => {
    sessionsApi.create.mockResolvedValue({
      createdAt: '2026-05-30T01:00:00Z',
      durationSec: 600,
      estimatedReadyInSec: 480,
      planet: 'Mars',
      pollAfterMs: 5000,
      sessionId: 'session_real',
      status: 'queued',
    });
    sessionsApi.get.mockResolvedValue({
      audio: null,
      completedAt: null,
      createdAt: '2026-05-30T01:00:00Z',
      durationSec: 600,
      error: null,
      lighting: null,
      planet: 'Mars',
      progress: null,
      sessionId: 'session_real',
      startedAt: null,
      status: 'queued',
      summary: null,
    });
    sessionsApi.feedback.mockResolvedValue({
      ok: true,
      savedAt: '2026-05-30T01:02:00Z',
    });

    await expect(createSession(payload, 'real')).resolves.toMatchObject({ sessionId: 'session_real' });
    await expect(getSession(pending, 'real')).resolves.toMatchObject({ sessionId: 'session_real' });
    await expect(submitFeedback('session_real', feedbackPayload, 'real')).resolves.toMatchObject({ ok: true });
    expect(sessionsApi.create).toHaveBeenCalledWith(payload);
    expect(sessionsApi.get).toHaveBeenCalledWith('session_test');
    expect(sessionsApi.feedback).toHaveBeenCalledWith('session_real', feedbackPayload);
  });

  it('uses mock session paths in mock mode', async () => {
    await expect(createSession(payload, 'mock')).resolves.toMatchObject({ status: 'queued' });
    await expect(getSession(pending, 'mock')).resolves.toMatchObject({ sessionId: 'session_test' });
    await expect(submitFeedback('session_mock', feedbackPayload, 'mock')).resolves.toMatchObject({ ok: true });
    expect(sessionsApi.create).not.toHaveBeenCalled();
    expect(sessionsApi.get).not.toHaveBeenCalled();
    expect(sessionsApi.feedback).not.toHaveBeenCalled();
  });
});
