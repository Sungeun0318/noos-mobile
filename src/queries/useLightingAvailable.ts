import { isLightingAvailable, type LightingGatewayMode } from '@/lighting/lightingState';

import { useHealth } from './useHealth';

export function useLightingAvailable(mode: LightingGatewayMode) {
  const health = useHealth();

  return isLightingAvailable({ healthLighting: health.data?.lighting, mode });
}
