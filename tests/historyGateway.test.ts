import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getHistory, listHistory } from '@/screens/history/historyGateway';
import { useHistoryStore } from '@/stores/historyStore';

import { __resetMMKV } from './mocks/react-native-mmkv';

const sessionsApi = vi.hoisted(() => ({
  get: vi.fn(),
  list: vi.fn(),
}));

vi.mock('@/api/noosApi', () => ({
  noosApi: {
    sessions: sessionsApi,
  },
}));

describe('historyGateway', () => {
  beforeEach(() => {
    __resetMMKV();
    vi.clearAllMocks();
    useHistoryStore.getState().clear();
  });

  it('lists local history in mock mode', async () => {
    useHistoryStore.getState().upsert({
      audio: null,
      completedAt: '2026-05-20T02:00:00.000Z',
      createdAt: '2026-05-20T01:50:00.000Z',
      currentState: null,
      durationSec: 600,
      feedbackSummary: null,
      intentText: null,
      planet: 'neptune',
      sessionId: 'session_local',
      stateLabel: null,
      summary: null,
    });

    await expect(listHistory('mock')).resolves.toMatchObject([{ sessionId: 'session_local' }]);
    expect(sessionsApi.list).not.toHaveBeenCalled();
  });

  it('lists server history in real mode and normalizes planet casing', async () => {
    sessionsApi.list.mockResolvedValue({
      hasMore: false,
      items: [
        {
          audio: { audioId: 'audio_real', durationSec: 600 },
          completedAt: '2026-05-20T02:00:00.000Z',
          createdAt: '2026-05-20T01:50:00.000Z',
          durationSec: 600,
          feedbackSummary: { focusResult: 0.75, musicFit: 0.8 },
          planet: 'Mars',
          sessionId: 'session_real',
          stateLabel: 'calm focus',
        },
      ],
      nextCursor: null,
    });

    await expect(listHistory('real')).resolves.toMatchObject([
      {
        planet: 'mars',
        sessionId: 'session_real',
      },
    ]);
    expect(sessionsApi.list).toHaveBeenCalledWith({ limit: 20, status: 'ready,completed' });
  });

  it('gets local history in mock mode', async () => {
    useHistoryStore.getState().upsert({
      audio: null,
      completedAt: '2026-05-20T02:00:00.000Z',
      createdAt: '2026-05-20T01:50:00.000Z',
      currentState: null,
      durationSec: 600,
      feedbackSummary: null,
      intentText: null,
      planet: 'earth',
      sessionId: 'session_local',
      stateLabel: null,
      summary: null,
    });

    await expect(getHistory('session_local', 'mock')).resolves.toMatchObject({ sessionId: 'session_local' });
    expect(sessionsApi.get).not.toHaveBeenCalled();
  });

  it('gets server history detail in real mode', async () => {
    sessionsApi.get.mockResolvedValue({
      audio: { audioId: 'audio_real', durationSec: 600 },
      completedAt: '2026-05-20T02:00:00.000Z',
      createdAt: '2026-05-20T01:50:00.000Z',
      durationSec: 600,
      error: null,
      lighting: null,
      planet: 'Earth',
      progress: null,
      sessionId: 'session_real',
      startedAt: null,
      status: 'ready',
      summary: { description: 'Grounded', title: 'Earth Ground' },
    });

    await expect(getHistory('session_real', 'real')).resolves.toMatchObject({
      planet: 'earth',
      sessionId: 'session_real',
      summary: { title: 'Earth Ground' },
    });
    expect(sessionsApi.get).toHaveBeenCalledWith('session_real');
  });
});
