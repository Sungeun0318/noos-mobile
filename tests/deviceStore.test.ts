import { beforeEach, describe, expect, it } from 'vitest';

import { useDeviceStore } from '@/stores/deviceStore';

describe('deviceStore', () => {
  beforeEach(() => {
    useDeviceStore.getState().resetMuse();
  });

  it('sets muse status', () => {
    useDeviceStore.getState().setMuseStatus('scanning');

    expect(useDeviceStore.getState().muse.status).toBe('scanning');
  });

  it('sets muse connection details', () => {
    useDeviceStore.getState().setMuseConnection({
      batteryPct: 88,
      deviceId: 'muse-sim',
      deviceName: 'Muse-SIM',
      lastConnectedAt: 1_000,
      rssi: -50,
      signalQuality: 0.86,
      status: 'connected',
    });

    expect(useDeviceStore.getState().muse).toMatchObject({
      batteryPct: 88,
      deviceId: 'muse-sim',
      deviceName: 'Muse-SIM',
      rssi: -50,
      signalQuality: 0.86,
      status: 'connected',
    });
  });

  it('resets muse connection state', () => {
    useDeviceStore.getState().setMuseConnection({ deviceId: 'muse-sim', status: 'connected' });

    useDeviceStore.getState().resetMuse();

    expect(useDeviceStore.getState().muse).toMatchObject({
      deviceId: null,
      status: 'idle',
    });
  });
});
