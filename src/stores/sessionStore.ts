import { create } from 'zustand';

import type { PlanetId } from '@/theme';

export type PendingSessionStatus = 'queued' | 'generating' | 'failed';

export interface PendingSession {
  sessionId: string;
  planet: PlanetId;
  durationSec: number;
  status: PendingSessionStatus;
  enqueuedAt: number;
  estimatedReadyInSec: number | null;
  progress: { phase: string; percent: number; etaSec: number } | null;
  error?: { code: string; message: string };
}

export interface SessionDraft {
  planet: PlanetId;
  durationSec: number;
}

interface SessionStoreShape {
  draft: SessionDraft | null;
  pending: PendingSession[];
  setDraft(draft: SessionDraft): void;
  addPending(session: PendingSession): void;
  updatePending(id: string, patch: Partial<PendingSession>): void;
  removePending(id: string): void;
  clear(): void;
}

const maxConcurrentPending = 3;

export function canAddPendingSession(pendingCount: number) {
  return pendingCount < maxConcurrentPending;
}

export const useSessionStore = create<SessionStoreShape>()((set) => ({
  // Pending is intentionally in-memory for FE-06. Restore + polling resume belongs to FE-07.
  draft: null,
  pending: [],
  setDraft: (draft) => set({ draft }),
  addPending: (session) =>
    set((state) => ({
      pending: [...state.pending.filter((item) => item.sessionId !== session.sessionId), session],
    })),
  updatePending: (id, patch) =>
    set((state) => ({
      pending: state.pending.map((session) =>
        session.sessionId === id ? { ...session, ...patch } : session,
      ),
    })),
  removePending: (id) =>
    set((state) => ({
      pending: state.pending.filter((session) => session.sessionId !== id),
    })),
  clear: () => set({ draft: null, pending: [] }),
}));
