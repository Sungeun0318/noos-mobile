import type { MeasureEeg } from '@/api/types';

export interface SimulatedMuseDevice {
  deviceId: string;
  name: string;
  isMuseCandidate?: boolean;
  rssi: number;
}

export interface MuseMeasureTick {
  elapsedSec: number;
  signalScore: number;
  sampleBufferLen: number;
}

export interface MuseMeasureOptions {
  tickMs?: number;
  now?: () => number;
  signal?: AbortSignal;
}

const sampleRateHz = 256;

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function rounded(value: number) {
  return Math.round(value * 10) / 10;
}

export const museSimulator = {
  // TODO FE-13b: replace with real BLE scan (react-native-ble-plx + Muse GATT).
  async scan(delayMs = 1500): Promise<SimulatedMuseDevice[]> {
    if (delayMs > 0) {
      await delay(delayMs);
    }

    return [{ deviceId: 'muse-sim', isMuseCandidate: true, name: 'Muse-SIM', rssi: -50 }];
  },

  // TODO FE-13b: replace with real BLE connect and service discovery.
  async connect(deviceId: string, delayMs = 900) {
    if (delayMs > 0) {
      await delay(delayMs);
    }

    return {
      deviceId,
      deviceName: 'Muse-SIM',
      rssi: -50,
      batteryPct: 88,
      signalQuality: 0.86,
      lastConnectedAt: Date.now(),
    };
  },

  // TODO FE-13b: replace synthetic bands with Muse packet parser + band summary.
  async measure(
    durationSec: number,
    onTick?: (tick: MuseMeasureTick) => void,
    options: MuseMeasureOptions = {},
  ): Promise<MeasureEeg> {
    const tickMs = options.tickMs ?? 1000;
    const now = options.now ?? Date.now;
    const safeDurationSec = Math.max(1, Math.round(durationSec));

    for (let elapsedSec = 1; elapsedSec <= safeDurationSec; elapsedSec += 1) {
      if (options.signal?.aborted) {
        throw new Error('measure aborted');
      }

      if (tickMs > 0) {
        await delay(tickMs);
      }

      const signalScore = clamp01(0.72 + elapsedSec / safeDurationSec * 0.16);
      onTick?.({
        elapsedSec,
        signalScore,
        sampleBufferLen: elapsedSec * sampleRateHz,
      });
    }

    const sampleCount = safeDurationSec * sampleRateHz;
    const measuredAt = new Date(now()).toISOString();

    return {
      bands: {
        delta: rounded(10.8 + safeDurationSec * 0.03),
        theta: rounded(18.2 + safeDurationSec * 0.04),
        alpha: rounded(26.5 + safeDurationSec * 0.05),
        beta: rounded(29.4 + safeDurationSec * 0.02),
        gamma: rounded(8.7 + safeDurationSec * 0.01),
      },
      deviceId: 'muse-sim',
      deviceType: 'Muse S Athena',
      measuredAt,
      measurementDurationSec: safeDurationSec,
      sampleCount,
      sampleRateHz,
      signalQuality: 0.88,
    };
  },
};
