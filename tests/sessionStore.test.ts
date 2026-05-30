import { beforeEach, describe, expect, it } from 'vitest';

import { canAddPendingSession, useSessionStore, type PendingSession } from '@/stores/sessionStore';

const basePending: PendingSession = {
  durationSec: 600,
  enqueuedAt: 1_000,
  estimatedReadyInSec: 480,
  planet: 'mars',
  progress: {
    etaSec: 480,
    percent: 0,
    phase: 'queued',
  },
  sessionId: 'session-test-1',
  status: 'queued',
};

describe('sessionStore', () => {
  beforeEach(() => {
    useSessionStore.getState().clear();
  });

  it('sets draft selection', () => {
    useSessionStore.getState().setDraft({ durationSec: 300, planet: 'neptune' });

    expect(useSessionStore.getState().draft).toEqual({ durationSec: 300, planet: 'neptune' });
  });

  it('adds, updates, and removes pending sessions', () => {
    useSessionStore.getState().addPending(basePending);

    expect(useSessionStore.getState().pending).toHaveLength(1);

    useSessionStore.getState().updatePending(basePending.sessionId, {
      progress: {
        etaSec: 240,
        percent: 0.5,
        phase: 'generating',
      },
      status: 'generating',
    });

    expect(useSessionStore.getState().pending[0]).toMatchObject({
      progress: { percent: 0.5 },
      status: 'generating',
    });

    useSessionStore.getState().removePending(basePending.sessionId);

    expect(useSessionStore.getState().pending).toHaveLength(0);
  });

  it('replaces a pending session with the same id', () => {
    useSessionStore.getState().addPending(basePending);
    useSessionStore.getState().addPending({ ...basePending, durationSec: 1_800 });

    expect(useSessionStore.getState().pending).toHaveLength(1);
    expect(useSessionStore.getState().pending[0]?.durationSec).toBe(1_800);
  });

  it('clears draft and pending sessions', () => {
    useSessionStore.getState().setDraft({ durationSec: 300, planet: 'venus' });
    useSessionStore.getState().addPending(basePending);

    useSessionStore.getState().clear();

    expect(useSessionStore.getState().draft).toBeNull();
    expect(useSessionStore.getState().pending).toEqual([]);
  });

  it('guards the pending concurrency boundary at three sessions', () => {
    expect(canAddPendingSession(2)).toBe(true);
    expect(canAddPendingSession(3)).toBe(false);
  });
});
