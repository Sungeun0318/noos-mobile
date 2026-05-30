import { create } from 'zustand';

export type MuseStatus = 'idle' | 'scanning' | 'connecting' | 'connected' | 'measuring' | 'error';

export interface MuseDeviceState {
  status: MuseStatus;
  deviceId: string | null;
  deviceName: string | null;
  rssi: number | null;
  batteryPct: number | null;
  signalQuality: number;
  lastConnectedAt: number | null;
  error: { code: string; message: string } | null;
}

interface DeviceStoreState {
  muse: MuseDeviceState;
  setMuseStatus(status: MuseStatus): void;
  setMuseConnection(info: Partial<MuseDeviceState>): void;
  resetMuse(): void;
}

const initialMuse: MuseDeviceState = {
  status: 'idle',
  deviceId: null,
  deviceName: null,
  rssi: null,
  batteryPct: null,
  signalQuality: 0,
  lastConnectedAt: null,
  error: null,
};

export const useDeviceStore = create<DeviceStoreState>()((set) => ({
  muse: initialMuse,
  setMuseStatus: (status) =>
    set((state) => ({
      muse: { ...state.muse, error: status === 'error' ? state.muse.error : null, status },
    })),
  setMuseConnection: (info) =>
    set((state) => ({
      muse: { ...state.muse, ...info, error: info.status === 'error' ? state.muse.error : null },
    })),
  resetMuse: () => set({ muse: initialMuse }),
}));
