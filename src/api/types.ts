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
