import type { PlanetId } from '@/theme';

export type AdaptiveSeedSource = 'survey' | 'eeg' | 'hybrid' | 'none';

export type AdaptiveSessionStatus = 'active' | 'paused' | 'ended' | 'failed';

export type AdaptiveSegmentStatus =
  | 'pending'
  | 'generating'
  | 'ready'
  | 'playing'
  | 'done'
  | 'failed';

export type AdaptiveActionType = 'none' | 'parameter_adjust' | 'crossfade';

export type AdaptiveWearStatus = 'worn' | 'uncertain' | 'off' | 'unknown';

export type AdaptiveNextGenStatus = 'idle' | 'pending' | 'generating' | 'ready' | 'failed';

export interface AdaptiveBands {
  delta: number | null;
  theta: number | null;
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
}

export interface AdaptiveSixAxis {
  focusReadiness: number | null;
  stressLoad: number | null;
  fatigueRisk: number | null;
  relaxationLevel: number | null;
  corticalArousal: number | null;
  mentalWorkload: number | null;
}

export interface AdaptiveSessionStartRequest {
  seedSource: AdaptiveSeedSource;
  planetHint?: string | null;
}

export interface AdaptiveSessionStartResponse {
  sessionId: string;
  status: AdaptiveSessionStatus;
  seedSegment: {
    segmentId: number;
    index: number;
    status: AdaptiveSegmentStatus;
  };
}

export interface AdaptiveWindowSubmitRequest {
  windowIndex: number;
  windowStartAt: string;
  windowDurationSec: number;
  sampleCount: number;
  sampleRateHz: number | null;
  bands: AdaptiveBands;
  dominantBand: string | null;
  qualityScore: number | null;
  signalOk: boolean;
}

export interface AdaptiveAction {
  type: AdaptiveActionType;
  reason: string | null;
  label: string | null;
  volumeScale: number;
}

export interface AdaptiveWindowSubmitResponse {
  windowId: number;
  sixAxis: AdaptiveSixAxis;
  adaptiveAction: AdaptiveAction;
  nextSegment: {
    id: number;
    index: number;
    status: AdaptiveSegmentStatus;
  } | null;
}

export interface AdaptiveSegmentView {
  segmentId: number;
  index: number;
  planet: string;
  status: AdaptiveSegmentStatus;
  audioId: string | null;
  streamPath?: string | null;
  fallback: boolean;
  durationSec: number;
  genStartedAt: string | null;
  genReadyAt: string | null;
  playedAt: string | null;
  createdAt: string;
}

export interface AdaptiveEegWindowView {
  windowId: number;
  index: number;
  windowStartAt: string;
  windowEndAt: string | null;
  durationSec: number;
  sampleCount: number;
  sampleRateHz: number | null;
  bands: AdaptiveBands;
  dominantBand: string | null;
  qualityScore: number | null;
  signalOk: boolean;
  currentState: AdaptiveSixAxis | null;
  stateLabel: string | null;
  adaptiveAction: AdaptiveActionType | string | null;
  createdAt: string;
}

export interface AdaptiveSessionResponse {
  sessionId: string;
  status: AdaptiveSessionStatus;
  initialPlanet: string;
  currentPlanet: string;
  seedSource: AdaptiveSeedSource;
  pausedReason: string | null;
  currentSegment: AdaptiveSegmentView | null;
  nextSegment: AdaptiveSegmentView | null;
  segments: AdaptiveSegmentView[];
  recentWindows: AdaptiveEegWindowView[];
  startedAt: string | null;
  pausedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

export interface AdaptiveSessionStatusResponse {
  sessionId: string;
  status: AdaptiveSessionStatus;
  pausedReason: string | null;
  pausedAt: string | null;
  endedAt: string | null;
}

export interface PauseAdaptiveSessionRequest {
  reason?: string | null;
}

export interface AdaptiveFeedbackRequest {
  musicFit: number;
  focusRelaxHelp: number;
  transitionNatural: number;
  memo: string;
  skipped: boolean;
}

export interface AdaptiveFeedbackResponse {
  ok: true;
  savedAt: string;
}

export function normalizeAdaptivePlanet(planet: string | null | undefined): PlanetId {
  const normalized = planet?.trim().toLowerCase();

  switch (normalized) {
    case 'mercury':
    case 'venus':
    case 'earth':
    case 'mars':
    case 'jupiter':
    case 'saturn':
    case 'uranus':
    case 'neptune':
    case 'pluto':
      return normalized;
    default:
      return 'neptune';
  }
}
