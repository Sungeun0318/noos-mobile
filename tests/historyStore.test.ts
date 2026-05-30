import { beforeEach, describe, expect, it } from 'vitest';

import {
  latestHistorySession,
  listHistorySessions,
  useHistoryStore,
  type HistorySession,
} from '@/stores/historyStore';

import { __resetMMKV } from './mocks/react-native-mmkv';

function session(overrides: Partial<HistorySession>): HistorySession {
  return {
    audio: null,
    completedAt: '2026-05-20T02:00:00.000Z',
    createdAt: '2026-05-20T01:50:00.000Z',
    currentState: null,
    durationSec: 600,
    feedbackSummary: null,
    intentText: null,
    planet: 'neptune',
    sessionId: 'session_a',
    stateLabel: null,
    summary: null,
    ...overrides,
  };
}

describe('historyStore', () => {
  beforeEach(() => {
    __resetMMKV();
    useHistoryStore.getState().clear();
  });

  it('upserts sessions with sessionId dedupe', () => {
    useHistoryStore.getState().upsert(session({ sessionId: 'session_a', stateLabel: 'calm' }));
    useHistoryStore.getState().upsert(session({ sessionId: 'session_a', stateLabel: 'focused' }));

    expect(useHistoryStore.getState().sessions).toHaveLength(1);
    expect(useHistoryStore.getState().getById('session_a')?.stateLabel).toBe('focused');
  });

  it('returns sessions sorted by completedAt desc and latest session', () => {
    const older = session({ completedAt: '2026-05-19T02:00:00.000Z', sessionId: 'older' });
    const newer = session({ completedAt: '2026-05-21T02:00:00.000Z', sessionId: 'newer' });

    useHistoryStore.getState().upsert(older);
    useHistoryStore.getState().upsert(newer);

    expect(listHistorySessions(useHistoryStore.getState().sessions).map((item) => item.sessionId)).toEqual([
      'newer',
      'older',
    ]);
    expect(latestHistorySession(useHistoryStore.getState().sessions)?.sessionId).toBe('newer');
  });

  it('gets by id and clears sessions', () => {
    useHistoryStore.getState().upsert(session({ sessionId: 'session_a' }));

    expect(useHistoryStore.getState().getById('session_a')?.sessionId).toBe('session_a');

    useHistoryStore.getState().clear();

    expect(useHistoryStore.getState().sessions).toEqual([]);
    expect(useHistoryStore.getState().getById('session_a')).toBeNull();
  });
});
