import type { CurrentState, SessionGetResponse, SessionListItem } from '@/api/types';
import type { HistoryFeedbackSummary, HistorySession } from '@/stores/historyStore';
import type { ActiveSession } from '@/stores/sessionStore';
import { normalizePlanetId } from '@/stores/stateStore';

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

export function historyFromSessionListItem(item: SessionListItem): HistorySession {
  return {
    audio: item.audio,
    completedAt: item.completedAt,
    createdAt: item.createdAt,
    currentState: null,
    durationSec: item.durationSec,
    feedbackSummary: item.feedbackSummary,
    intentText: null,
    planet: normalizePlanetId(item.planet),
    sessionId: item.sessionId,
    stateLabel: item.stateLabel,
    summary: null,
  };
}

export function historyFromSessionGetResponse(response: SessionGetResponse): HistorySession {
  const completedAt = response.completedAt ?? response.startedAt ?? response.createdAt;

  return {
    audio: response.audio
      ? {
          audioId: response.audio.audioId,
          durationSec: response.audio.durationSec,
        }
      : null,
    completedAt,
    createdAt: response.createdAt,
    currentState: response.currentState ?? null,
    durationSec: response.durationSec,
    feedbackSummary: response.feedbackSummary ?? null,
    intentText: response.intentText ?? null,
    planet: normalizePlanetId(response.planet),
    sessionId: response.sessionId,
    stateLabel: response.stateLabel ?? null,
    summary: response.summary,
  };
}
