import { create } from 'zustand';

import type { SessionAudio, SessionError, SessionLighting, SessionSummary } from '@/api/types';
import type { PlanetId } from '@/theme';

export type SessionStoreStatus =
  | 'queued'
  | 'generating'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'completed'
  | 'failed';

export type PendingSessionStatus = 'queued' | 'generating' | 'ready' | 'failed';

export interface PendingSession {
  sessionId: string;
  planet: PlanetId;
  durationSec: number;
  status: PendingSessionStatus;
  enqueuedAt: number;
  estimatedReadyInSec: number | null;
  progress: { phase: string; percent: number; etaSec: number } | null;
  audio?: SessionAudio | null;
  lighting?: SessionLighting | null;
  summary?: SessionSummary | null;
  error?: SessionError | null;
}

export interface SessionDraft {
  planet: PlanetId;
  durationSec: number;
}

export interface ActiveSession {
  sessionId: string;
  planet: PlanetId;
  durationSec: number;
  audio: SessionAudio | null;
  lighting: SessionLighting | null;
  summary: SessionSummary | null;
  status: SessionStoreStatus;
  startedAt: number | null;
}

interface SessionStoreShape {
  draft: SessionDraft | null;
  pending: PendingSession[];
  active: ActiveSession | null;
  setDraft(draft: SessionDraft): void;
  addPending(session: PendingSession): void;
  updatePending(id: string, patch: Partial<PendingSession>): void;
  promoteToActive(id: string): void;
  setActive(active: ActiveSession | null): void;
  setStatus(status: SessionStoreStatus): void;
  removePending(id: string): void;
  clearActive(): void;
  clear(): void;
}

const maxConcurrentPending = 3;

export function canAddPendingSession(pendingCount: number) {
  return pendingCount < maxConcurrentPending;
}

export const useSessionStore = create<SessionStoreShape>()((set) => ({
  // Pending is intentionally in-memory for FE-06. Restore + polling resume belongs to FE-07.
  active: null,
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
  promoteToActive: (id) =>
    set((state) => {
      const pending = state.pending.find((session) => session.sessionId === id);

      if (!pending) {
        return {};
      }

      return {
        active: {
          audio: pending.audio ?? null,
          durationSec: pending.durationSec,
          lighting: pending.lighting ?? null,
          planet: pending.planet,
          sessionId: pending.sessionId,
          startedAt: Date.now(),
          status: 'playing',
          summary: pending.summary ?? null,
        },
        pending: state.pending.filter((session) => session.sessionId !== id),
      };
    }),
  setActive: (active) => set({ active }),
  setStatus: (status) =>
    set((state) => ({
      active: state.active ? { ...state.active, status } : null,
    })),
  removePending: (id) =>
    set((state) => ({
      pending: state.pending.filter((session) => session.sessionId !== id),
    })),
  clearActive: () => set({ active: null }),
  clear: () => set({ active: null, draft: null, pending: [] }),
}));
