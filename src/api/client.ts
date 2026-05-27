export interface NoosApiClientConfig {
  baseUrl: string;
  getAccessToken?: () => string | null | Promise<string | null>;
  getDeviceId?: () => string | null | Promise<string | null>;
}

export class NoosApiClient {
  private config: NoosApiClientConfig;

  constructor(config: NoosApiClientConfig) {
    this.config = config;
  }

  setBaseUrl(baseUrl: string) {
    this.config = { ...this.config, baseUrl };
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const accessToken = await this.config.getAccessToken?.();
    const deviceId = await this.config.getDeviceId?.();
    const headers = new Headers(init.headers);

    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    if (deviceId) {
      headers.set('x-device-id', deviceId);
    }

    const response = await fetch(`${this.config.baseUrl}${path}`, { ...init, headers });

    if (!response.ok) {
      throw new Error(`NOOS API request failed with status ${response.status}`);
    }

    return response.json() as Promise<T>;
  }
}

export const noosApiClient = new NoosApiClient({
  baseUrl: process.env.EXPO_PUBLIC_DEFAULT_BACKEND_URL ?? '',
});
