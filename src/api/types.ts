export type HealthStatus = 'ok' | 'degraded' | 'down' | 'unknown';

export interface MobileHealthResponse {
  backend: HealthStatus;
  ai: HealthStatus;
  aceStep: HealthStatus;
  lighting: HealthStatus;
  version: string;
  minAppVersion: string;
  serverTime: string;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId: string | null;
  };
}

export interface MobileUser {
  userId: number;
  loginId: string;
  displayName: string;
}

export interface AuthResponse {
  user: MobileUser;
  accessToken: string;
  refreshToken?: string | null;
  expiresIn: number;
}

export interface MeResponse {
  mode: 'guest' | 'authed';
  deviceId: string;
  user: MobileUser | null;
}

export interface MeasureSurvey {
  focus?: number | null;
  stress?: number | null;
  fatigue?: number | null;
  relaxation?: number | null;
  intentText?: string | null;
}

export interface MeasureRequest {
  survey: MeasureSurvey;
  eeg?: MeasureEeg | null;
}

export interface MeasureEeg {
  deviceType: string;
  deviceId: string;
  measuredAt: string;
  measurementDurationSec: number;
  sampleRateHz: number;
  sampleCount: number;
  signalQuality: number;
  bands: {
    delta: number;
    theta: number;
    alpha: number;
    beta: number;
    gamma: number;
  };
}

export interface CurrentState {
  focus_readiness: number;
  stress_load: number;
  fatigue_risk: number;
  relaxation_level: number;
  cortical_arousal: number;
  mental_workload: number;
}

export type MeasureSource = 'survey' | 'eeg' | 'hybrid';

export interface MeasureResponse {
  measurementId: string;
  stateLabel: string;
  currentState: CurrentState;
  recommendedPlanet: string;
  alternates: string[];
  confidence: number;
  source: MeasureSource;
  weight: {
    survey: number;
    eeg: number;
  };
  measuredAt: string;
}

export interface EnqueueSessionRequest {
  planet: string;
  durationSec: number;
  measurementId?: string | null;
  currentState?: CurrentState | null;
  stateLabel?: string | null;
  intentText?: string | null;
  source?: MeasureSource | null;
  lightingEnabled: boolean;
  idempotencyKey: string;
}

export interface EnqueueSessionResponse {
  sessionId: string;
  status: 'queued';
  planet: string;
  durationSec: number;
  estimatedReadyInSec: number;
  pollAfterMs: number;
  createdAt: string;
}

export type SessionStatus = 'queued' | 'generating' | 'ready' | 'failed' | 'completed';

export interface SessionProgress {
  phase: string;
  percent: number;
  etaSec: number;
}

export interface SessionError {
  code: string;
  message: string;
}

export interface SessionAudio {
  audioId: string;
  streamUrl?: string;
  durationSec: number;
}

export interface SessionLighting {
  active: boolean;
  jobId: string | null;
}

export interface SessionSummary {
  title: string;
  description: string;
}

export interface SessionGetResponse {
  sessionId: string;
  status: SessionStatus;
  planet: string;
  durationSec: number;
  stateLabel?: string | null;
  currentState?: CurrentState | null;
  intentText?: string | null;
  progress: SessionProgress | null;
  audio: SessionAudio | null;
  lighting: SessionLighting | null;
  summary: SessionSummary | null;
  feedbackSummary?: {
    musicFit: number;
    focusResult: number;
  } | null;
  error: SessionError | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface FeedbackRequest {
  musicFit: number;
  lightingFit: number;
  focusResult: number;
  memo: string;
}

export interface FeedbackResponse {
  ok: true;
  savedAt: string;
}

export interface SessionListItem {
  sessionId: string;
  planet: string;
  durationSec: number;
  stateLabel: string | null;
  createdAt: string;
  completedAt: string;
  audio: {
    audioId: string;
    durationSec: number;
  } | null;
  feedbackSummary: {
    musicFit: number;
    focusResult: number;
  } | null;
}

export interface SessionListResponse {
  items: SessionListItem[];
  nextCursor: string | null;
  hasMore: boolean;
}
