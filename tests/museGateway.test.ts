import { describe, expect, it } from 'vitest';

import { selectMuseGatewayMode } from '@/screens/measure/museGateway';

describe('selectMuseGatewayMode', () => {
  it('uses simulator when simulationMode is enabled', () => {
    expect(selectMuseGatewayMode(true)).toBe('sim');
  });

  it('uses real BLE when simulationMode is disabled', () => {
    expect(selectMuseGatewayMode(false)).toBe('real');
  });
});
