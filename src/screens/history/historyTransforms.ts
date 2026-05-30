import type { CurrentState } from '@/api/types';
import type { HistoryFeedbackSummary, HistorySession } from '@/stores/historyStore';
import type { ActiveSession } from '@/stores/sessionStore';

export interface HistoryStateSnapshot {
  currentState: CurrentState | null;
  stateLabel: string | null;
  intentText: string | null;
}

export function historyFromActiveSession(
  active: ActiveSession,
  snapshot: HistoryStateSnapshot,
  feedbackSummary: HistoryFeedbackSummary | null,
  completedAt = new Date().toISOString(),
): HistorySession {
  return {
    audio: active.audio
      ? {
          audioId: active.audio.audioId,
          durationSec: active.audio.durationSec,
        }
      : null,
    completedAt,
    createdAt: active.startedAt ? new Date(active.startedAt).toISOString() : completedAt,
    currentState: snapshot.currentState,
    durationSec: active.durationSec,
    feedbackSummary,
    intentText: snapshot.intentText,
    planet: active.planet,
    sessionId: active.sessionId,
    stateLabel: snapshot.stateLabel,
    summary: active.summary,
  };
}

export function activeFromHistorySession(session: HistorySession): ActiveSession {
  return {
    audio: session.audio
      ? {
          audioId: session.audio.audioId,
          durationSec: session.audio.durationSec,
          // TODO: use real streamUrl (noosApi.audio.streamUrl) once backend wired.
          streamUrl: `mock://audio/${session.sessionId}`,
        }
      : null,
    durationSec: session.durationSec,
    lighting: null,
    planet: session.planet,
    sessionId: session.sessionId,
    startedAt: Date.now(),
    status: 'playing',
    summary: session.summary,
  };
}
