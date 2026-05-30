import { describe, expect, it } from 'vitest';

import { museSimulator } from '@/screens/measure/museSimulator';

describe('museSimulator', () => {
  it('scans a simulated Muse device', async () => {
    await expect(museSimulator.scan(0)).resolves.toEqual([
      { deviceId: 'muse-sim', name: 'Muse-SIM', rssi: -50 },
    ]);
  });

  it('connects a simulated Muse device', async () => {
    await expect(museSimulator.connect('muse-sim', 0)).resolves.toMatchObject({
      batteryPct: 88,
      deviceId: 'muse-sim',
      deviceName: 'Muse-SIM',
      signalQuality: 0.86,
    });
  });

  it('returns EEG DTO shaped measurement data', async () => {
    const ticks: number[] = [];
    const eeg = await museSimulator.measure(
      2,
      (tick) => {
        ticks.push(tick.elapsedSec);
      },
      { now: () => 1_800_000, tickMs: 0 },
    );

    expect(ticks).toEqual([1, 2]);
    expect(eeg).toMatchObject({
      deviceId: 'muse-sim',
      deviceType: 'Muse S Athena',
      measuredAt: '1970-01-01T00:30:00.000Z',
      measurementDurationSec: 2,
      sampleCount: 512,
      sampleRateHz: 256,
    });
    expect(eeg.signalQuality).toBeGreaterThanOrEqual(0);
    expect(eeg.signalQuality).toBeLessThanOrEqual(1);
    expect(Object.keys(eeg.bands)).toEqual(['delta', 'theta', 'alpha', 'beta', 'gamma']);
  });
});
