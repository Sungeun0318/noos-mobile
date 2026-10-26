import type { SessionLighting } from '@/api/types';
import type { LightingGatewayMode } from '@/lighting/lightingState';

export async function setSessionLighting(
  sessionId: string,
  enabled: boolean,
  mode: LightingGatewayMode,
): Promise<SessionLighting> {
  if (mode === 'mock') {
    return { active: false, enabled };
  }

  const { noosApi } = await import('@/api/noosApi');

  return noosApi.sessions.setLighting(sessionId, enabled);
}

export async function setAdaptiveSessionLighting(
  sessionId: string,
  enabled: boolean,
  mode: LightingGatewayMode,
): Promise<SessionLighting> {
  if (mode === 'mock') {
    return { active: false, enabled };
  }

  const { noosApi } = await import('@/api/noosApi');

  return noosApi.adaptive.setLighting(sessionId, enabled);
}

export async function stopLighting(mode: LightingGatewayMode): Promise<void> {
  if (mode === 'mock') {
    return;
  }

  const { noosApi } = await import('@/api/noosApi');

  await noosApi.lighting.stop();
}
