import type {
  AdaptiveFeedbackRequest,
  AdaptiveSegmentView,
  AdaptiveSessionResponse,
  AdaptiveSixAxis,
} from '@/api/adaptiveTypes';
import { normalizeAdaptivePlanet } from '@/api/adaptiveTypes';
import type { AdaptiveSessionModeKey } from '@/api/adaptiveTypes';
import type { CurrentState } from '@/api/types';
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
  adaptiveMode: AdaptiveSessionModeKey | null = null,
): HistorySession {
  const planet = normalizeAdaptivePlanet(session.currentPlanet ?? session.initialPlanet);
  const planetMeta = PLANETS[planet];
  const readyAudioSegment = latestReadyAudioSegment(session.segments);
  const latestWindow = session.recentWindows[0] ?? null;

  return {
    adaptiveMode,
    audio: readyAudioSegment?.audioId
      ? {
          audioId: readyAudioSegment.audioId,
          durationSec: readyAudioSegment.durationSec,
        }
      : null,
    completedAt: session.endedAt ?? completedAt,
    createdAt: session.startedAt ?? session.createdAt,
    currentState: latestWindow?.currentState ? currentStateFromAdaptive(latestWindow.currentState) : null,
    durationSec: totalDurationSec(session.segments),
    feedbackSummary,
    intentText: null,
    kind: 'adaptive',
    planet,
    sessionId: session.sessionId,
    stateLabel: latestWindow?.stateLabel ?? '적응형 세션',
    summary: {
      description: 'Muse 신호를 기반으로 음악을 조정한 적응형 세션입니다.',
      title: `${planetMeta.trackName} Adaptive`,
    },
  };
}

function currentStateFromAdaptive(state: AdaptiveSixAxis): CurrentState {
  return {
    cortical_arousal: numeric(state.corticalArousal),
    fatigue_risk: numeric(state.fatigueRisk),
    focus_readiness: numeric(state.focusReadiness),
    mental_workload: numeric(state.mentalWorkload),
    relaxation_level: numeric(state.relaxationLevel),
    stress_load: numeric(state.stressLoad),
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

function numeric(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
