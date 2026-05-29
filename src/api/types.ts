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
