import type { AdaptiveBands, AdaptiveWearStatus } from '@/api/adaptiveTypes';

export interface WearDetectorConfig {
  signalThreshold: number;
  offDebounceMs: number;
  packetTimeoutMs: number;
  flatlineEpsilon: number;
}

export interface WearDetectorState {
  status: AdaptiveWearStatus;
  badSince: number | null;
  lastPacketAt: number | null;
  reason: WearDetectorReason | null;
}

export type WearDetectorReason =
  | 'ble_disconnected'
  | 'flatline'
  | 'invalid_bands'
  | 'low_quality'
  | 'low_signal'
  | 'packet_timeout';

export interface WearDetectorInput {
  now: number;
  signalScore?: number | null;
  qualityScore?: number | null;
  bands?: AdaptiveBands | null;
  bleConnected?: boolean;
  packetReceived?: boolean;
}

export const defaultWearDetectorConfig: WearDetectorConfig = {
  flatlineEpsilon: 0.0001,
  offDebounceMs: 6_000,
  packetTimeoutMs: 3_000,
  signalThreshold: 0.35,
};

export function createInitialWearDetectorState(
  status: AdaptiveWearStatus = 'unknown',
): WearDetectorState {
  return {
    badSince: null,
    lastPacketAt: null,
    reason: null,
    status,
  };
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function bandValues(bands: AdaptiveBands) {
  return [bands.delta, bands.theta, bands.alpha, bands.beta, bands.gamma];
}

function bandReason(bands: AdaptiveBands | null | undefined, epsilon: number): WearDetectorReason | null {
  if (!bands) {
    return null;
  }

  const values = bandValues(bands);

  if (values.some((value) => !isFiniteNumber(value))) {
    return 'invalid_bands';
  }

  const finiteValues = values.filter(isFiniteNumber);
  const max = Math.max(...finiteValues);
  const min = Math.min(...finiteValues);

  if (max - min <= epsilon) {
    return 'flatline';
  }

  return null;
}

function badReason(
  state: WearDetectorState,
  input: WearDetectorInput,
  config: WearDetectorConfig,
): WearDetectorReason | null {
  const lastPacketAt = input.packetReceived ? input.now : state.lastPacketAt;

  if (input.bleConnected === false) {
    return 'ble_disconnected';
  }

  if (lastPacketAt !== null && input.now - lastPacketAt > config.packetTimeoutMs) {
    return 'packet_timeout';
  }

  if (isFiniteNumber(input.signalScore) && input.signalScore < config.signalThreshold) {
    return 'low_signal';
  }

  if (isFiniteNumber(input.qualityScore) && input.qualityScore < config.signalThreshold) {
    return 'low_quality';
  }

  return bandReason(input.bands, config.flatlineEpsilon);
}

export function reduceWearDetector(
  state: WearDetectorState,
  input: WearDetectorInput,
  config: WearDetectorConfig = defaultWearDetectorConfig,
): WearDetectorState {
  const lastPacketAt = input.packetReceived ? input.now : state.lastPacketAt;
  const reason = badReason(state, input, config);

  if (!reason) {
    return {
      badSince: null,
      lastPacketAt,
      reason: null,
      status: 'worn',
    };
  }

  const badSince = state.badSince ?? input.now;
  const status = input.now - badSince >= config.offDebounceMs ? 'off' : 'uncertain';

  return {
    badSince,
    lastPacketAt,
    reason,
    status,
  };
}
