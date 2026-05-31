import type { MeasureEeg } from '@/api/types';
import {
  museSimulator,
  type MuseMeasureOptions,
  type MuseMeasureTick,
  type SimulatedMuseDevice,
} from '@/screens/measure/museSimulator';
import { useSettingsStore } from '@/stores/settingsStore';

interface MuseClient {
  scan(): Promise<SimulatedMuseDevice[]>;
  connect(deviceId: string): Promise<{
    deviceId: string;
    deviceName: string;
    rssi: number | null;
    batteryPct: number | null;
    signalQuality: number;
    lastConnectedAt: number;
  }>;
  measure(durationSec: number, onTick: (tick: MuseMeasureTick) => void, options?: MuseMeasureOptions): Promise<MeasureEeg>;
}

export type MuseGatewayMode = 'sim' | 'real';

export function selectMuseGatewayMode(simulationMode: boolean): MuseGatewayMode {
  return simulationMode ? 'sim' : 'real';
}

async function getMuseClient(): Promise<MuseClient> {
  const mode = selectMuseGatewayMode(useSettingsStore.getState().simulationMode);

  if (mode === 'sim') {
    return museSimulator;
  }

  const { museBle } = await import('@/screens/measure/museBle');
  return museBle;
}

export const museGateway = {
  async scan() {
    return (await getMuseClient()).scan();
  },

  async connect(deviceId: string) {
    return (await getMuseClient()).connect(deviceId);
  },

  async measure(durationSec: number, onTick: (tick: MuseMeasureTick) => void, options?: MuseMeasureOptions) {
    return (await getMuseClient()).measure(durationSec, onTick, options);
  },
};
