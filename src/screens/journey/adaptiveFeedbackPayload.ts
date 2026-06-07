import type {
  AdaptiveFeedbackRequest,
  AdaptiveSegmentView,
  AdaptiveSessionResponse,
} from '@/api/adaptiveTypes';
import { normalizeAdaptivePlanet } from '@/api/adaptiveTypes';
import type { HistoryFeedbackSummary, HistorySession } from '@/stores/historyStore';
import { PLANETS } from '@/theme';

export interface AdaptiveFeedbackInput {
  musicFit: number;
  focusRelaxHelp: number;
  transitionNatural: number;
  memo: string;
  skipped?: boolean;
}

export function buildAdaptiveFeedbackPayload(input: AdaptiveFeedbackInput): AdaptiveFeedbackRequest {
  return {
    focusRelaxHelp: clampRating(input.focusRelaxHelp),
    memo: input.memo.trim(),
    musicFit: clampRating(input.musicFit),
    skipped: input.skipped ?? false,
    transitionNatural: clampRating(input.transitionNatural),
  };
}

export function adaptiveFeedbackSummaryFromPayload(
  payload: AdaptiveFeedbackRequest,
): HistoryFeedbackSummary | null {
  if (payload.skipped) {
    return null;
  }

  return {
    focusResult: payload.focusRelaxHelp,
    memo: payload.memo || null,
    musicFit: payload.musicFit,
    transitionNatural: payload.transitionNatural,
  };
}

export function historyFromAdaptiveSession(
  session: AdaptiveSessionResponse,
  feedbackSummary: HistoryFeedbackSummary | null,
  completedAt = new Date().toISOString(),
): HistorySession {
  const planet = normalizeAdaptivePlanet(session.currentPlanet ?? session.initialPlanet);
  const planetMeta = PLANETS[planet];
  const readyAudioSegment = latestReadyAudioSegment(session.segments);
  const latestWindow = session.recentWindows[0] ?? null;

  return {
    audio: readyAudioSegment?.audioId
      ? {
          audioId: readyAudioSegment.audioId,
          durationSec: readyAudioSegment.durationSec,
        }
      : null,
    completedAt: session.endedAt ?? completedAt,
    createdAt: session.startedAt ?? session.createdAt,
    currentState: null,
    durationSec: totalDurationSec(session.segments),
    feedbackSummary,
    intentText: null,
    planet,
    sessionId: session.sessionId,
    stateLabel: latestWindow?.stateLabel ?? '적응형 세션',
    summary: {
      description: 'Muse 신호를 기반으로 음악을 조정한 적응형 세션입니다.',
      title: `${planetMeta.trackName} Adaptive`,
    },
  };
}

function clampRating(value: number) {
  if (!Number.isFinite(value)) {
    return 0.5;
  }

  return Math.max(0, Math.min(value, 1));
}

function latestReadyAudioSegment(segments: AdaptiveSegmentView[]) {
  return [...segments]
    .reverse()
    .find((segment) => segment.status === 'ready' && Boolean(segment.audioId)) ?? null;
}

function totalDurationSec(segments: AdaptiveSegmentView[]) {
  const total = segments.reduce((sum, segment) => sum + segment.durationSec, 0);

  return total > 0 ? total : 0;
}
