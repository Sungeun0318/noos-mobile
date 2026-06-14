import { createMMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import type { CurrentState, SessionSummary } from '@/api/types';
import type { AdaptiveSessionModeKey } from '@/api/adaptiveTypes';
import type { PlanetId } from '@/theme';

export interface HistoryFeedbackSummary {
  musicFit: number;
  focusResult: number;
  transitionNatural?: number;
  memo?: string | null;
}

export interface HistoryAudioSummary {
  audioId: string;
  durationSec: number;
  streamPath?: string | null;
}

export interface HistorySession {
  kind?: 'single' | 'adaptive';
  adaptiveMode?: AdaptiveSessionModeKey | null;
  sessionId: string;
  planet: PlanetId;
  durationSec: number;
  stateLabel: string | null;
  createdAt: string;
  completedAt: string;
  audio: HistoryAudioSummary | null;
  feedbackSummary: HistoryFeedbackSummary | null;
  intentText: string | null;
  currentState: CurrentState | null;
  summary: SessionSummary | null;
}

interface HistoryStoreShape {
  sessions: HistorySession[];
  upsert(session: HistorySession): void;
  getById(id: string): HistorySession | null;
  clear(): void;
}

const storage = createMMKV({ id: 'noos.history.v1' });

const zustandStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => {
    storage.remove(name);
  },
};

export function listHistorySessions(sessions: HistorySession[]) {
  return [...sessions].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  );
}

export function latestHistorySession(sessions: HistorySession[]) {
  return listHistorySessions(sessions)[0] ?? null;
}

export const useHistoryStore = create<HistoryStoreShape>()(
  persist(
    (set, get) => ({
      sessions: [],
      upsert: (session) =>
        set((state) => ({
          sessions: [
            session,
            ...state.sessions.filter((item) => item.sessionId !== session.sessionId),
          ],
        })),
      getById: (id) => get().sessions.find((session) => session.sessionId === id) ?? null,
      clear: () => set({ sessions: [] }),
    }),
    {
      name: 'noos.history.v1',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
