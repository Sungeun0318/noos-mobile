import { currentAdaptiveGatewayMode, type AdaptiveGatewayMode } from '@/api/adaptiveGateway';
import type { AdaptiveSeedSource, AdaptiveSessionStartRequest } from '@/api/adaptiveTypes';
import type { MuseStatus } from '@/stores/deviceStore';
import { PLANETS, type PlanetId } from '@/theme';

export const BACKEND_ADAPTIVE_PLANETS = [
  'Mercury',
  'Venus',
  'Earth',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
] as const;

export type BackendAdaptivePlanet = (typeof BACKEND_ADAPTIVE_PLANETS)[number];

const backendPlanetSet = new Set<string>(BACKEND_ADAPTIVE_PLANETS);

export type AdaptiveSetupMethod = 'realEeg' | 'simulationEeg' | 'survey';

export interface AdaptiveSetupInput {
  method: AdaptiveSetupMethod;
  museStatus: MuseStatus;
  planet: PlanetId;
  lightingEnabled?: boolean;
}

export interface AdaptiveSetupCtaState {
  action: 'connectMuse' | 'start';
  label: string;
}

export function toBackendAdaptivePlanet(planet: PlanetId): BackendAdaptivePlanet {
  const title = PLANETS[planet].title;

  if (!backendPlanetSet.has(title)) {
    return 'Neptune';
  }

  return title as BackendAdaptivePlanet;
}

export function isMuseConnected(museStatus: MuseStatus) {
  return museStatus === 'connected' || museStatus === 'measuring';
}

export function getAdaptiveSeedSource(input: {
  method: AdaptiveSetupMethod;
  museStatus: MuseStatus;
}): AdaptiveSeedSource {
  if (input.method === 'survey') {
    return 'survey';
  }

  if (input.method === 'simulationEeg') {
    return 'eeg';
  }

  return isMuseConnected(input.museStatus) ? 'eeg' : 'none';
}

export function getAdaptiveSetupCtaState(input: {
  method: AdaptiveSetupMethod;
  museStatus: MuseStatus;
}): AdaptiveSetupCtaState {
  if (input.method === 'realEeg' && !isMuseConnected(input.museStatus)) {
    return {
      action: 'connectMuse',
      label: 'Muse 연결하기',
    };
  }

  return {
    action: 'start',
    label: '적응형 세션 시작',
  };
}

export function buildAdaptiveStartRequest(input: AdaptiveSetupInput): AdaptiveSessionStartRequest {
  return {
    lightingEnabled: input.lightingEnabled ?? false,
    planetHint: toBackendAdaptivePlanet(input.planet),
    seedSource: getAdaptiveSeedSource(input),
  };
}

// 시작할 때 측정 방식에 맞춰 simulationMode 를 바꾸므로(시뮬 EEG=켬, 실제 EEG=끔) 바뀐 뒤 기준으로 본다.
export function getAdaptiveStartGatewayMode(input: {
  method: AdaptiveSetupMethod;
  simulationMode: boolean;
  adaptiveBackendReal: boolean;
}): AdaptiveGatewayMode {
  const simulation =
    input.method === 'simulationEeg' ? true : input.method === 'realEeg' ? false : input.simulationMode;

  return currentAdaptiveGatewayMode(simulation, input.adaptiveBackendReal);
}
