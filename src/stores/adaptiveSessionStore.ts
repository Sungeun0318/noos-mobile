import { create } from 'zustand';

import type {
  AdaptiveAction,
  AdaptiveEegWindowView,
  AdaptiveNextGenStatus,
  AdaptiveSegmentStatus,
  AdaptiveSegmentView,
  AdaptiveSessionResponse,
  AdaptiveSessionStartResponse,
  AdaptiveWearStatus,
  AdaptiveWindowSubmitRequest,
  AdaptiveWindowSubmitResponse,
} from '@/api/adaptiveTypes';
import { normalizeAdaptivePlanet } from '@/api/adaptiveTypes';
import { PLANETS } from '@/theme';

type SegmentNextGenStatus = Exclude<AdaptiveNextGenStatus, 'idle'>;

interface ApplyStartOptions {
  planetHint?: string | null;
  seedSource?: AdaptiveSessionResponse['seedSource'];
  startedAt?: string;
}

interface AdaptiveSessionStoreShape {
  session: AdaptiveSessionResponse | null;
  segments: AdaptiveSegmentView[];
  currentSegmentIndex: number | null;
  recentWindows: AdaptiveEegWindowView[];
  lastAction: AdaptiveAction | null;
  wearStatus: AdaptiveWearStatus;
  nextGenStatus: AdaptiveNextGenStatus;
  setSession(session: AdaptiveSessionResponse | null): void;
  applyStartResponse(response: AdaptiveSessionStartResponse, options?: ApplyStartOptions): void;
  applyGetResponse(response: AdaptiveSessionResponse): void;
  applyWindowResult(
    response: AdaptiveWindowSubmitResponse,
    submittedWindow?: AdaptiveWindowSubmitRequest,
  ): void;
  setWearStatus(status: AdaptiveWearStatus): void;
  clear(): void;
}

const initialState = {
  currentSegmentIndex: null,
  lastAction: null,
  nextGenStatus: 'idle' as AdaptiveNextGenStatus,
  recentWindows: [],
  segments: [],
  session: null,
  wearStatus: 'unknown' as AdaptiveWearStatus,
};

export function deriveCurrentSegmentIndex(session: AdaptiveSessionResponse | null) {
  return session?.currentSegment?.index ?? session?.segments[0]?.index ?? null;
}

export function deriveNextGenStatus(
  session: AdaptiveSessionResponse | null,
  segments: AdaptiveSegmentView[] = session?.segments ?? [],
): AdaptiveNextGenStatus {
  const nextStatus = session?.nextSegment?.status;

  if (nextStatus === 'pending' || nextStatus === 'generating' || nextStatus === 'ready' || nextStatus === 'failed') {
    return nextStatus;
  }

  const latestGenerating = [...segments]
    .reverse()
    .find((segment) => isNextGenStatus(segment.status));
  const latestStatus = latestGenerating?.status;

  return latestStatus && isNextGenStatus(latestStatus) ? latestStatus : 'idle';
}

function isNextGenStatus(status: AdaptiveSegmentStatus): status is SegmentNextGenStatus {
  return status === 'pending' || status === 'generating' || status === 'ready' || status === 'failed';
}

function buildSeedSession(
  response: AdaptiveSessionStartResponse,
  options: ApplyStartOptions = {},
): AdaptiveSessionResponse {
  const now = options.startedAt ?? new Date().toISOString();
  const planet = PLANETS[normalizeAdaptivePlanet(options.planetHint)].title;
  const seedSegment: AdaptiveSegmentView = {
    audioId: null,
    createdAt: now,
    durationSec: 120,
    fallback: false,
    genReadyAt: null,
    genStartedAt: null,
    index: response.seedSegment.index,
    planet,
    playedAt: null,
    segmentId: response.seedSegment.segmentId,
    status: response.seedSegment.status,
  };

  return {
    createdAt: now,
    currentPlanet: planet,
    currentSegment: seedSegment,
    endedAt: null,
    initialPlanet: planet,
    nextSegment: seedSegment,
    pausedAt: null,
    pausedReason: null,
    recentWindows: [],
    seedSource: options.seedSource ?? 'none',
    segments: [seedSegment],
    sessionId: response.sessionId,
    startedAt: now,
    status: response.status,
  };
}

function segmentFromWindowResult(
  response: AdaptiveWindowSubmitResponse,
  session: AdaptiveSessionResponse | null,
): AdaptiveSegmentView | null {
  if (!response.nextSegment) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    audioId: null,
    createdAt: now,
    durationSec: 120,
    fallback: false,
    genReadyAt: null,
    genStartedAt: null,
    index: response.nextSegment.index,
    planet: session?.currentPlanet ?? session?.initialPlanet ?? PLANETS.neptune.title,
    playedAt: null,
    segmentId: response.nextSegment.id,
    status: response.nextSegment.status,
  };
}

function windowFromResult(
  response: AdaptiveWindowSubmitResponse,
  submittedWindow: AdaptiveWindowSubmitRequest,
): AdaptiveEegWindowView {
  const startMs = Date.parse(submittedWindow.windowStartAt);
  const safeStartMs = Number.isFinite(startMs) ? startMs : Date.now();

  return {
    adaptiveAction: response.adaptiveAction.type,
    bands: submittedWindow.bands,
    createdAt: new Date().toISOString(),
    currentState: response.sixAxis,
    dominantBand: submittedWindow.dominantBand,
    durationSec: submittedWindow.windowDurationSec,
    index: submittedWindow.windowIndex,
    qualityScore: submittedWindow.qualityScore,
    sampleCount: submittedWindow.sampleCount,
    sampleRateHz: submittedWindow.sampleRateHz,
    signalOk: submittedWindow.signalOk,
    stateLabel: response.adaptiveAction.label,
    windowEndAt: new Date(safeStartMs + submittedWindow.windowDurationSec * 1_000).toISOString(),
    windowId: response.windowId,
    windowStartAt: submittedWindow.windowStartAt,
  };
}

function mergeSegment(segments: AdaptiveSegmentView[], segment: AdaptiveSegmentView) {
  return [...segments.filter((item) => item.segmentId !== segment.segmentId), segment].sort(
    (a, b) => a.index - b.index,
  );
}

function withDerived(session: AdaptiveSessionResponse | null, segments = session?.segments ?? []) {
  return {
    currentSegmentIndex: deriveCurrentSegmentIndex(session),
    nextGenStatus: deriveNextGenStatus(session, segments),
  };
}

export const useAdaptiveSessionStore = create<AdaptiveSessionStoreShape>()((set) => ({
  ...initialState,
  setSession: (session) =>
    set({
      ...withDerived(session),
      recentWindows: session?.recentWindows ?? [],
      segments: session?.segments ?? [],
      session,
    }),
  applyStartResponse: (response, options) =>
    set(() => {
      const session = buildSeedSession(response, options);

      return {
        ...withDerived(session),
        lastAction: null,
        recentWindows: [],
        segments: session.segments,
        session,
      };
    }),
  applyGetResponse: (response) =>
    set({
      ...withDerived(response),
      recentWindows: response.recentWindows,
      segments: response.segments,
      session: response,
    }),
  applyWindowResult: (response, submittedWindow) =>
    set((state) => {
      const nextSegment = segmentFromWindowResult(response, state.session);
      const segments = nextSegment ? mergeSegment(state.segments, nextSegment) : state.segments;
      const recentWindows = submittedWindow
        ? [windowFromResult(response, submittedWindow), ...state.recentWindows].slice(0, 8)
        : state.recentWindows;
      const session = state.session
        ? {
            ...state.session,
            nextSegment: nextSegment ?? state.session.nextSegment,
            recentWindows,
            segments,
          }
        : null;

      return {
        ...withDerived(session, segments),
        lastAction: response.adaptiveAction,
        recentWindows,
        segments,
        session,
      };
    }),
  setWearStatus: (status) => set({ wearStatus: status }),
  clear: () => set(initialState),
}));
