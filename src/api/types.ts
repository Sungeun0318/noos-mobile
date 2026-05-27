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
