import type {
  AdaptiveAction,
  AdaptiveEegWindowView,
  AdaptiveSegmentView,
  AdaptiveSessionResponse,
  AdaptiveSessionStartRequest,
  AdaptiveSessionStartResponse,
  AdaptiveSessionStatusResponse,
  AdaptiveWindowSubmitRequest,
  AdaptiveWindowSubmitResponse,
  PauseAdaptiveSessionRequest,
} from '@/api/adaptiveTypes';
import { normalizeAdaptivePlanet } from '@/api/adaptiveTypes';
import { PLANETS } from '@/theme';

const seedReadyMs = 4_000;
const seedGeneratingMs = 1_000;
const segmentDurationSec = 120;

let sessionCounter = 0;
let segmentCounter = 0;
let windowCounter = 0;

interface MockSessionRecord {
  session: AdaptiveSessionResponse;
}

const sessions = new Map<string, MockSessionRecord>();

function iso(ms = Date.now()) {
  return new Date(ms).toISOString();
}

function createSegment(input: {
  createdAtMs: number;
  index: number;
  planet: string;
  status: AdaptiveSegmentView['status'];
}): AdaptiveSegmentView {
  segmentCounter += 1;

  return {
    audioId: null,
    createdAt: iso(input.createdAtMs),
    durationSec: segmentDurationSec,
    fallback: false,
    genReadyAt: null,
    genStartedAt: null,
    index: input.index,
    planet: input.planet,
    playedAt: null,
    segmentId: segmentCounter,
    status: input.status,
  };
}

function segmentWithElapsed(segment: AdaptiveSegmentView, elapsedMs: number): AdaptiveSegmentView {
  if (segment.status !== 'pending' && segment.status !== 'generating') {
    return segment;
  }

  if (elapsedMs >= seedReadyMs) {
    return {
      ...segment,
      audioId: `audio_adaptive_mock_${segment.segmentId}`,
      genReadyAt: iso(Date.parse(segment.createdAt) + seedReadyMs),
      genStartedAt: iso(Date.parse(segment.createdAt) + seedGeneratingMs),
      status: 'ready',
    };
  }

  if (elapsedMs >= seedGeneratingMs) {
    return {
      ...segment,
      genStartedAt: iso(Date.parse(segment.createdAt) + seedGeneratingMs),
      status: 'generating',
    };
  }

  return segment;
}

function updateProgress(record: MockSessionRecord, now = Date.now()) {
  const segments = record.session.segments.map((segment) =>
    segmentWithElapsed(segment, Math.max(now - Date.parse(segment.createdAt), 0)),
  );
  const currentSegment =
    [...segments].reverse().find((segment) =>
      segment.status === 'ready' || segment.status === 'playing' || segment.status === 'done',
    ) ?? segments[0] ?? null;
  const nextSegment =
    [...segments].reverse().find((segment) => segment.status === 'pending' || segment.status === 'generating') ??
    null;

  record.session = {
    ...record.session,
    currentSegment,
    nextSegment,
    segments,
  };
}

function makeStatusResponse(session: AdaptiveSessionResponse): AdaptiveSessionStatusResponse {
  return {
    endedAt: session.endedAt,
    pausedAt: session.pausedAt,
    pausedReason: session.pausedReason,
    sessionId: session.sessionId,
    status: session.status,
  };
}

function actionForWindow(payload: AdaptiveWindowSubmitRequest): AdaptiveAction {
  if (!payload.signalOk || (payload.qualityScore ?? 0) < 0.35) {
    return {
      label: '신호가 안정될 때까지 유지',
      reason: 'low_signal_quality',
      type: 'none',
      volumeScale: 1,
    };
  }

  if (payload.windowIndex > 0 && payload.windowIndex % 2 === 0) {
    return {
      label: '다음 구간으로 부드럽게 전환',
      reason: 'state_shift_detected',
      type: 'crossfade',
      volumeScale: 1,
    };
  }

  return {
    label: '현재 트랙을 조금 조정',
    reason: 'minor_state_shift',
    type: 'parameter_adjust',
    volumeScale: 0.92,
  };
}

function windowFromPayload(
  payload: AdaptiveWindowSubmitRequest,
  response: AdaptiveWindowSubmitResponse,
): AdaptiveEegWindowView {
  const startMs = Date.parse(payload.windowStartAt);
  const safeStartMs = Number.isFinite(startMs) ? startMs : Date.now();

  return {
    adaptiveAction: response.adaptiveAction.type,
    bands: payload.bands,
    createdAt: iso(),
    currentState: response.sixAxis,
    dominantBand: payload.dominantBand,
    durationSec: payload.windowDurationSec,
    index: payload.windowIndex,
    qualityScore: payload.qualityScore,
    sampleCount: payload.sampleCount,
    sampleRateHz: payload.sampleRateHz,
    signalOk: payload.signalOk,
    stateLabel: response.adaptiveAction.label,
    windowEndAt: iso(safeStartMs + payload.windowDurationSec * 1_000),
    windowId: response.windowId,
    windowStartAt: payload.windowStartAt,
  };
}

function getRecord(id: string) {
  const record = sessions.get(id);

  if (!record) {
    throw new Error(`adaptive mock session not found: ${id}`);
  }

  return record;
}

export function __resetAdaptiveMock() {
  sessionCounter = 0;
  segmentCounter = 0;
  windowCounter = 0;
  sessions.clear();
}

export async function startAdaptiveSessionMock(
  payload: AdaptiveSessionStartRequest,
  now = Date.now(),
): Promise<AdaptiveSessionStartResponse> {
  sessionCounter += 1;

  const planetId = normalizeAdaptivePlanet(payload.planetHint);
  const planet = PLANETS[planetId].title;
  const sessionId = `adaptive_mock_${sessionCounter}`;
  const seedSegment = createSegment({
    createdAtMs: now,
    index: 0,
    planet,
    status: 'pending',
  });

  sessions.set(sessionId, {
    session: {
      createdAt: iso(now),
      currentPlanet: planet,
      currentSegment: seedSegment,
      endedAt: null,
      initialPlanet: planet,
      nextSegment: seedSegment,
      pausedAt: null,
      pausedReason: null,
      recentWindows: [],
      seedSource: payload.seedSource,
      segments: [seedSegment],
      sessionId,
      startedAt: iso(now),
      status: 'active',
    },
  });

  return {
    seedSegment: {
      index: seedSegment.index,
      segmentId: seedSegment.segmentId,
      status: seedSegment.status,
    },
    sessionId,
    status: 'active',
  };
}

export async function getAdaptiveSessionMock(
  id: string,
  now = Date.now(),
): Promise<AdaptiveSessionResponse> {
  const record = getRecord(id);
  updateProgress(record, now);

  return record.session;
}

export async function submitAdaptiveWindowMock(
  id: string,
  payload: AdaptiveWindowSubmitRequest,
): Promise<AdaptiveWindowSubmitResponse> {
  const record = getRecord(id);
  updateProgress(record);
  windowCounter += 1;

  const adaptiveAction = actionForWindow(payload);
  const response: AdaptiveWindowSubmitResponse = {
    adaptiveAction,
    nextSegment: null,
    sixAxis: {
      corticalArousal: Math.min(1, Math.max(0, ((payload.bands.beta ?? 0) + (payload.bands.gamma ?? 0)) / 2)),
      fatigueRisk: Math.min(1, Math.max(0, payload.bands.delta ?? 0)),
      focusReadiness: Math.min(1, Math.max(0, payload.bands.alpha ?? 0)),
      mentalWorkload: Math.min(1, Math.max(0, payload.bands.beta ?? 0)),
      relaxationLevel: Math.min(1, Math.max(0, payload.bands.theta ?? 0)),
      stressLoad: Math.min(1, Math.max(0, payload.bands.gamma ?? 0)),
    },
    windowId: windowCounter,
  };

  if (adaptiveAction.type === 'crossfade') {
    const segment = createSegment({
      createdAtMs: Date.now(),
      index: record.session.segments.length,
      planet: record.session.currentPlanet,
      status: 'pending',
    });
    record.session = {
      ...record.session,
      nextSegment: segment,
      segments: [...record.session.segments, segment],
    };
    response.nextSegment = {
      id: segment.segmentId,
      index: segment.index,
      status: segment.status,
    };
  }

  record.session = {
    ...record.session,
    recentWindows: [windowFromPayload(payload, response), ...record.session.recentWindows].slice(0, 8),
  };

  return response;
}

export async function pauseAdaptiveSessionMock(
  id: string,
  payload: PauseAdaptiveSessionRequest = {},
): Promise<AdaptiveSessionStatusResponse> {
  const record = getRecord(id);
  record.session = {
    ...record.session,
    pausedAt: iso(),
    pausedReason: payload.reason ?? null,
    status: 'paused',
  };

  return makeStatusResponse(record.session);
}

export async function resumeAdaptiveSessionMock(id: string): Promise<AdaptiveSessionStatusResponse> {
  const record = getRecord(id);
  record.session = {
    ...record.session,
    pausedAt: null,
    pausedReason: null,
    status: 'active',
  };

  return makeStatusResponse(record.session);
}

export async function endAdaptiveSessionMock(id: string): Promise<AdaptiveSessionStatusResponse> {
  const record = getRecord(id);
  record.session = {
    ...record.session,
    endedAt: iso(),
    status: 'ended',
  };

  return makeStatusResponse(record.session);
}
