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

export function toBackendAdaptivePlanet(planet: PlanetId): BackendAdaptivePlanet {
  const title = PLANETS[planet].title;

  if (!backendPlanetSet.has(title)) {
    return 'Neptune';
  }

  return title as BackendAdaptivePlanet;
}

export function getAdaptiveSeedSource(museStatus: MuseStatus): AdaptiveSeedSource {
  return museStatus === 'connected' || museStatus === 'measuring' ? 'eeg' : 'none';
}

export function buildAdaptiveStartRequest(input: {
  museStatus: MuseStatus;
  planet: PlanetId;
}): AdaptiveSessionStartRequest {
  return {
    planetHint: toBackendAdaptivePlanet(input.planet),
    seedSource: getAdaptiveSeedSource(input.museStatus),
  };
}
