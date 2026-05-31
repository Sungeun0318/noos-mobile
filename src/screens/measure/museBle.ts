import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, State, type Characteristic, type Device, type Subscription } from 'react-native-ble-plx';

import type { MeasureEeg } from '@/api/types';
import { logger } from '@/lib/logger';
import { calculateBandPowers } from '@/screens/measure/eegBands';
import {
  athenaDataCharacteristicUuids,
  base64ToBytes,
  bytesToHex,
  controlCharacteristicUuid,
  createAthenaPacketReassembler,
  decodeClassicEegPacket,
  decodeControlText,
  eegCharacteristicUuids,
  encodeMuseCommand,
  museServiceUuid,
  parseAthenaDataPacket,
} from '@/screens/measure/museProtocol';
import type { MuseMeasureOptions, MuseMeasureTick, SimulatedMuseDevice } from '@/screens/measure/museSimulator';

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

const log = logger.create('museBle');
const sampleRateHz = 256;
const streamPreset = 'p1041';
const requestedMtu = 256;

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

function findCharacteristic(characteristics: Characteristic[], uuid: string) {
  return characteristics.find((characteristic) => characteristic.uuid.toLowerCase() === uuid.toLowerCase()) ?? null;
}

function selectDataCharacteristics(characteristics: Characteristic[]) {
  const classic = eegCharacteristicUuids
    .map((uuid, channelIndex) => {
      const characteristic = findCharacteristic(characteristics, uuid);
      return characteristic ? { characteristic, channelIndex, decoder: 'classic' as const, label: `classic-${channelIndex}` } : null;
    })
    .filter((value): value is NonNullable<typeof value> => value !== null);

  if (classic.length === eegCharacteristicUuids.length) {
    return classic;
  }

  const athena = athenaDataCharacteristicUuids
    .map((uuid, channelIndex) => {
      const characteristic = findCharacteristic(characteristics, uuid);
      return characteristic ? { characteristic, channelIndex, decoder: 'athena' as const, label: `athena-${channelIndex + 1}` } : null;
    })
    .filter((value): value is NonNullable<typeof value> => value !== null);

  if (athena.length > 0) {
    log.warn('classic Muse EEG characteristics missing; using Athena data characteristics', {
      available: characteristics.map((characteristic) => characteristic.uuid),
      selected: athena.map(({ characteristic }) => characteristic.uuid),
    });
  }

  return athena;
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new MuseBleError('CONNECT_FAILED', 'measure aborted'));
      return;
    }

    const onAbort = () => {
      clearTimeout(timer);
      reject(new MuseBleError('CONNECT_FAILED', 'measure aborted'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

async function sendCommand(control: Characteristic, command: string) {
  log.info('sending Muse command', { command });
  const encoded = encodeMuseCommand(command);

  await control.writeWithoutResponse(encoded).catch(() => control.writeWithResponse(encoded));
}

async function sendCommandStep(control: Characteristic, command: string, delayMs: number, optional: boolean, signal?: AbortSignal) {
  try {
    await sendCommand(control, command);
  } catch (error) {
    if (!optional) {
      throw error;
    }

    log.warn('optional Muse command failed', { command, message: error instanceof Error ? error.message : String(error) });
  }

  if (delayMs > 0) {
    await sleep(delayMs, signal);
  }
}

async function sendStartSequence(control: Characteristic, signal?: AbortSignal) {
  await sendCommandStep(control, 'v6', 200, true, signal);
  await sendCommandStep(control, 's', 200, true, signal);
  await sendCommandStep(control, 'h', 200, true, signal);
  await sendCommandStep(control, streamPreset, 200, false, signal);
  await sendCommandStep(control, 's', 200, true, signal);
  await sendCommandStep(control, 'dc001', 50, false, signal);
  await sendCommandStep(control, 'dc001', 100, false, signal);
  await sendCommandStep(control, 'L1', 300, true, signal);
  await sendCommandStep(control, 's', 200, true, signal);
  log.info('Muse stream command sequence completed', { streamPreset });
}

function appendAthenaRows(channels: number[][], rows: number[][]) {
  rows.forEach((row) => {
    for (let channelIndex = 0; channelIndex < Math.min(4, row.length); channelIndex += 1) {
      const sample = row[channelIndex];

      if (Number.isFinite(sample)) {
        channels[channelIndex].push(sample);
      }
    }
  });
}

function signalQualityFromChannels(channels: number[][], elapsedSec: number) {
  const expected = Math.max(1, elapsedSec * sampleRateHz);
  const activeChannels = channels.filter((channel) => channel.length > 0).length;
  const sampleCoverage = Math.min(1, Math.min(...channels.map((channel) => channel.length)) / expected);
  return Math.max(0, Math.min(1, activeChannels / 4 * sampleCoverage));
}

function logPacketSample(label: string, uuid: string, bytes: Uint8Array, decoded: number[] | number[][], packetCount: number, meta?: unknown) {
  if (packetCount > 1 && packetCount % sampleRateHz !== 0) {
    return;
  }

  const flat = Array.isArray(decoded[0]) ? (decoded as number[][]).flat() : decoded as number[];
  const finite = flat.filter(Number.isFinite);

  log.info('Muse EEG notification', {
    byteLength: bytes.length,
    count: finite.length,
    label,
    max: finite.length ? Math.max(...finite) : null,
    min: finite.length ? Math.min(...finite) : null,
    packetCount,
    uuid,
    ...((meta && typeof meta === 'object') ? meta : {}),
  });
}

function shouldLogRawPacket(packetCount: number) {
  return packetCount <= 12 || packetCount % sampleRateHz === 0;
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
      const mtuDevice =
        Platform.OS === 'android'
          ? await connected.requestMTU(requestedMtu).catch((error) => {
              log.warn('Muse MTU request failed; continuing with default MTU', {
                message: error instanceof Error ? error.message : String(error),
                requestedMtu,
              });
              return connected;
            })
          : connected;
      const discovered = await mtuDevice.discoverAllServicesAndCharacteristics();
      const withRssi = await discovered.readRSSI().catch(() => discovered);
      connectedDevice = withRssi;
      log.info('Muse BLE connected', { deviceId: withRssi.id, mtu: withRssi.mtu ?? null });

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

  async measure(durationSec: number, onTick: (tick: MuseMeasureTick) => void, options: MuseMeasureOptions = {}): Promise<MeasureEeg> {
    if (!connectedDevice) {
      throw new MuseBleError('CONNECT_FAILED', 'Muse device is not connected');
    }

    const device = connectedDevice;
    const characteristics = await getManager().characteristicsForDevice(device.id, museServiceUuid);
    const control = findCharacteristic(characteristics, controlCharacteristicUuid);
    const dataCharacteristics = selectDataCharacteristics(characteristics);

    if (!control) {
      throw new MuseBleError('CONNECT_FAILED', 'Muse control characteristic was not found');
    }

    if (dataCharacteristics.length === 0) {
      throw new MuseBleError('CONNECT_FAILED', 'Muse EEG characteristics were not found');
    }

    const safeDurationSec = Math.max(1, Math.round(durationSec));
    const channels = [[], [], [], []] as number[][];
    const subscriptions: Subscription[] = [];
    const athenaReassemblers = new Map<string, ReturnType<typeof createAthenaPacketReassembler>>();
    let packetCount = 0;
    let controlInfoFragment = '';

    const cleanup = async () => {
      subscriptions.forEach((subscription) => subscription.remove());
      await sendCommand(control, 'h').catch((error) => {
        log.warn('Muse halt command failed during cleanup', { message: error instanceof Error ? error.message : String(error) });
      });
    };

    try {
      subscriptions.push(control.monitor((error, characteristic) => {
        if (error) {
          log.warn('Muse control notification error', { message: error.message });
          return;
        }

        if (!characteristic?.value) {
          return;
        }

        const text = decodeControlText(characteristic.value);
        if (!text) {
          return;
        }

        controlInfoFragment = `${controlInfoFragment}${text}`.slice(-4096);
        log.info('Muse control response', { text });
      }));

      dataCharacteristics.forEach(({ characteristic, channelIndex, decoder, label }) => {
        subscriptions.push(characteristic.monitor((error, nextCharacteristic) => {
          if (error) {
            log.warn('Muse EEG notification error', { label, message: error.message });
            return;
          }

          if (!nextCharacteristic?.value) {
            return;
          }

          packetCount += 1;
          const bytes = base64ToBytes(nextCharacteristic.value);

          if (decoder === 'athena') {
            const reassembler =
              athenaReassemblers.get(characteristic.uuid) ?? createAthenaPacketReassembler();
            athenaReassemblers.set(characteristic.uuid, reassembler);
            const reassembled = reassembler.append(bytes);
            const packetResults = reassembled.completedPackets.map((packet) => parseAthenaDataPacket(packet));
            const eegRows = packetResults.flatMap((result) => result.eegRows);
            const packetTags = packetResults.flatMap((result) => result.packetTags);
            appendAthenaRows(channels, eegRows);
            if (shouldLogRawPacket(packetCount)) {
              log.info('Muse EEG raw notification', {
                byteLength: bytes.length,
                bufferLength: reassembled.bufferLength,
                completedPacketCount: reassembled.completedPackets.length,
                droppedBytes: reassembled.droppedBytes,
                firstByte: bytes[0] ?? null,
                hex: bytesToHex(bytes),
                label,
                packetCount,
                uuid: characteristic.uuid,
              });
            }
            logPacketSample(label, characteristic.uuid, bytes, eegRows, packetCount, {
              bufferLength: reassembled.bufferLength,
              completedPacketCount: reassembled.completedPackets.length,
              droppedBytes: reassembled.droppedBytes,
              eegRowCount: eegRows.length,
              packetTags,
            });
            return;
          }

          const samples = decodeClassicEegPacket(bytes);
          channels[channelIndex].push(...samples);
          logPacketSample(label, characteristic.uuid, bytes, samples, packetCount);
        }));
      });

      await sendStartSequence(control, options.signal);

      for (let elapsedSec = 1; elapsedSec <= safeDurationSec; elapsedSec += 1) {
        await sleep(1000, options.signal);
        const sampleBufferLen = Math.min(...channels.map((channel) => channel.length));
        const signalScore = signalQualityFromChannels(channels, elapsedSec);

        if (elapsedSec === 3 && sampleBufferLen === 0) {
          log.warn('Muse data characteristics subscribed but no EEG samples arrived yet', {
            characteristicCount: dataCharacteristics.length,
            streamPreset,
          });
        }

        onTick({
          elapsedSec,
          sampleBufferLen,
          signalScore,
        });
      }

      const sampleCount = Math.min(...channels.map((channel) => channel.length));

      if (sampleCount === 0) {
        throw new MuseBleError('CONNECT_FAILED', 'Muse EEG packets did not contain samples');
      }

      const signalQuality = signalQualityFromChannels(channels, safeDurationSec);
      const bands = calculateBandPowers(channels.map((channel) => channel.slice(0, sampleCount)), sampleRateHz);
      log.info('Muse EEG measurement complete', {
        bands,
        packetCount,
        sampleCount,
        signalQuality,
      });

      return {
        bands,
        deviceId: device.id,
        deviceType: 'Muse S Athena',
        measuredAt: new Date().toISOString(),
        measurementDurationSec: safeDurationSec,
        sampleCount,
        sampleRateHz,
        signalQuality: Number(signalQuality.toFixed(3)),
      };
    } finally {
      await cleanup();
      void controlInfoFragment;
    }
  },
};
