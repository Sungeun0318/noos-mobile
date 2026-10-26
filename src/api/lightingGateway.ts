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

// 이 세션이 잡고 있는 조명만 끈다. 그사이 다른 세션이 조명을 잡았으면 백엔드가 그대로 둔다.
export async function stopLighting(sessionId: string, mode: LightingGatewayMode): Promise<void> {
  if (mode === 'mock') {
    return;
  }

  const { noosApi } = await import('@/api/noosApi');

  await noosApi.lighting.stop(sessionId);
}
