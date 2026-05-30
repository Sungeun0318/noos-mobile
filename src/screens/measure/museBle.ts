import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, State, type Device } from 'react-native-ble-plx';

import type { MeasureEeg } from '@/api/types';
import { museSimulator, type MuseMeasureTick, type SimulatedMuseDevice } from '@/screens/measure/museSimulator';

type BlePermissionStatus = 'granted' | 'denied';

interface MuseBleConnection {
  deviceId: string;
  deviceName: string;
  rssi: number | null;
  batteryPct: number | null;
  signalQuality: number;
  lastConnectedAt: number;
}

export class MuseBleError extends Error {
  constructor(
    public readonly code: 'PERMISSION_DENIED' | 'BLUETOOTH_OFF' | 'SCAN_FAILED' | 'CONNECT_FAILED',
    message: string,
  ) {
    super(message);
    this.name = 'MuseBleError';
  }
}

let manager: BleManager | null = null;
let connectedDevice: Device | null = null;

const museServiceUuid = '0000fe8d-0000-1000-8000-00805f9b34fb';

function getManager() {
  manager ??= new BleManager();
  return manager;
}

function getAdvertisedName(device: Device) {
  return device.name ?? device.localName;
}

function getDisplayName(device: Device) {
  return getAdvertisedName(device) ?? `Unknown BLE Device (${device.id.slice(0, 6)})`;
}

function normalizeUuid(uuid: string) {
  return uuid.toLowerCase();
}

function isMuseServiceUuid(uuid: string) {
  const normalized = normalizeUuid(uuid);
  return normalized === museServiceUuid || normalized === 'fe8d' || normalized.startsWith('0000fe8d-');
}

function isMuseCandidate(device: Device) {
  const advertisedName = getAdvertisedName(device);

  if (advertisedName?.toLowerCase().includes('muse')) {
    return true;
  }

  return device.serviceUUIDs?.some(isMuseServiceUuid) ?? false;
}

function sortBleDevices(devices: SimulatedMuseDevice[]) {
  return [...devices].sort((a, b) => {
    if (a.isMuseCandidate !== b.isMuseCandidate) {
      return a.isMuseCandidate ? -1 : 1;
    }

    return b.rssi - a.rssi;
  });
}

async function requestBlePermissions(): Promise<BlePermissionStatus> {
  if (Platform.OS !== 'android') {
    return 'granted';
  }

  const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : Number(Platform.Version);
  const permissions =
    apiLevel >= 31
      ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  const results = await PermissionsAndroid.requestMultiple(permissions);
  const granted = permissions.every((permission) => results[permission] === PermissionsAndroid.RESULTS.GRANTED);
  return granted ? 'granted' : 'denied';
}

async function ensurePoweredOn() {
  const bleManager = getManager();
  const state = await bleManager.state();

  if (state === State.PoweredOn) {
    return;
  }

  if (state === State.Unknown || state === State.Resetting) {
    await waitForPoweredOn(bleManager);
    return;
  }

  throw stateToBleError(state);
}

function waitForPoweredOn(bleManager: BleManager) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      subscription.remove();
      reject(new MuseBleError('BLUETOOTH_OFF', 'Bluetooth is not powered on'));
    }, 3000);

    const subscription = bleManager.onStateChange((nextState) => {
      if (nextState === State.PoweredOn) {
        clearTimeout(timer);
        subscription.remove();
        resolve();
        return;
      }

      if (nextState !== State.Unknown && nextState !== State.Resetting) {
        clearTimeout(timer);
        subscription.remove();
        reject(stateToBleError(nextState));
      }
    }, true);
  });
}

function stateToBleError(state: State) {
  if (state === State.Unauthorized) {
    return new MuseBleError('PERMISSION_DENIED', 'Bluetooth permission was denied');
  }

  if (state === State.Unsupported) {
    return new MuseBleError('SCAN_FAILED', 'Bluetooth LE is not supported on this device');
  }

  return new MuseBleError('BLUETOOTH_OFF', 'Bluetooth is not powered on');
}

export const museBle = {
  async scan(timeoutMs = 5000): Promise<SimulatedMuseDevice[]> {
    const permission = await requestBlePermissions();

    if (permission !== 'granted') {
      throw new MuseBleError('PERMISSION_DENIED', 'Bluetooth permission was denied');
    }

    await ensurePoweredOn();

    const bleManager = getManager();
    const devicesById = new Map<string, SimulatedMuseDevice>();

    return new Promise((resolve, reject) => {
      let settled = false;

      const finish = (devices: SimulatedMuseDevice[]) => {
        if (settled) {
          return;
        }

        settled = true;
        bleManager.stopDeviceScan();
        resolve(sortBleDevices(devices));
      };

      const fail = (error: unknown) => {
        if (settled) {
          return;
        }

        settled = true;
        bleManager.stopDeviceScan();
        reject(error);
      };

      const timer = setTimeout(() => finish(Array.from(devicesById.values())), timeoutMs);

      bleManager.startDeviceScan(null, { allowDuplicates: true }, (error, device) => {
        if (error) {
          clearTimeout(timer);
          fail(new MuseBleError('SCAN_FAILED', error.message));
          return;
        }

        if (!device) {
          return;
        }

        devicesById.set(device.id, {
          deviceId: device.id,
          isMuseCandidate: isMuseCandidate(device),
          name: getDisplayName(device),
          rssi: device.rssi ?? -100,
        });
      });
    });
  },

  async connect(deviceId: string): Promise<MuseBleConnection> {
    await ensurePoweredOn();

    try {
      const connected = await getManager().connectToDevice(deviceId, { timeout: 10000 });
      const discovered = await connected.discoverAllServicesAndCharacteristics();
      const withRssi = await discovered.readRSSI().catch(() => discovered);
      connectedDevice = withRssi;

      return {
        deviceId: withRssi.id,
        deviceName: getDisplayName(withRssi),
        rssi: withRssi.rssi,
        batteryPct: null,
        signalQuality: 0.72,
        lastConnectedAt: Date.now(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'connect failed';
      throw new MuseBleError('CONNECT_FAILED', message);
    }
  },

  measure(durationSec: number, onTick: (tick: MuseMeasureTick) => void): Promise<MeasureEeg> {
    void connectedDevice;
    // TODO FE-13b-2: replace simulator fallback with real Muse EEG stream decode.
    return museSimulator.measure(durationSec, onTick);
  },
};
