import { describe, expect, it } from 'vitest';

import {
  BACKEND_ADAPTIVE_PLANETS,
  buildAdaptiveStartRequest,
  getAdaptiveSeedSource,
  toBackendAdaptivePlanet,
} from '@/screens/journey/adaptiveSetupLogic';
import { PLANETS, type PlanetId } from '@/theme';

const expectedBackendPlanets = [
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

describe('adaptiveSetupLogic', () => {
  it('keeps mobile planet ids aligned with backend planet names', () => {
    expect(BACKEND_ADAPTIVE_PLANETS).toEqual(expectedBackendPlanets);

    for (const [planetId, meta] of Object.entries(PLANETS) as Array<[PlanetId, (typeof PLANETS)[PlanetId]]>) {
      expect(toBackendAdaptivePlanet(planetId)).toBe(meta.title);
      expect(expectedBackendPlanets).toContain(meta.title as (typeof expectedBackendPlanets)[number]);
    }
  });

  it('uses EEG seed only when Muse is connected or measuring', () => {
    expect(getAdaptiveSeedSource('connected')).toBe('eeg');
    expect(getAdaptiveSeedSource('measuring')).toBe('eeg');
    expect(getAdaptiveSeedSource('idle')).toBe('none');
    expect(getAdaptiveSeedSource('scanning')).toBe('none');
  });

  it('builds adaptive start payload with backend planet casing', () => {
    expect(buildAdaptiveStartRequest({ museStatus: 'connected', planet: 'venus' })).toEqual({
      planetHint: 'Venus',
      seedSource: 'eeg',
    });
    expect(buildAdaptiveStartRequest({ museStatus: 'idle', planet: 'neptune' })).toEqual({
      planetHint: 'Neptune',
      seedSource: 'none',
    });
  });
});
