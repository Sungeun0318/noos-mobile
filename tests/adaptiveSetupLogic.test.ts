import { describe, expect, it } from 'vitest';

import {
  BACKEND_ADAPTIVE_PLANETS,
  buildAdaptiveStartRequest,
  getAdaptiveSetupCtaState,
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

  it('maps setup method and Muse status to seedSource', () => {
    expect(getAdaptiveSeedSource({ method: 'realEeg', museStatus: 'connected' })).toBe('eeg');
    expect(getAdaptiveSeedSource({ method: 'realEeg', museStatus: 'measuring' })).toBe('eeg');
    expect(getAdaptiveSeedSource({ method: 'realEeg', museStatus: 'idle' })).toBe('none');
    expect(getAdaptiveSeedSource({ method: 'simulationEeg', museStatus: 'idle' })).toBe('eeg');
    expect(getAdaptiveSeedSource({ method: 'survey', museStatus: 'connected' })).toBe('survey');
  });

  it('builds adaptive start payload with backend planet casing', () => {
    expect(buildAdaptiveStartRequest({ method: 'realEeg', museStatus: 'connected', planet: 'venus' })).toEqual({
      planetHint: 'Venus',
      seedSource: 'eeg',
    });
    expect(buildAdaptiveStartRequest({ method: 'survey', museStatus: 'idle', planet: 'neptune' })).toEqual({
      planetHint: 'Neptune',
      seedSource: 'survey',
    });
  });

  it('switches CTA from Muse connection to start based on method and connection', () => {
    expect(getAdaptiveSetupCtaState({ method: 'realEeg', museStatus: 'idle' })).toEqual({
      action: 'connectMuse',
      label: 'Muse 연결하기',
    });
    expect(getAdaptiveSetupCtaState({ method: 'realEeg', museStatus: 'connected' })).toEqual({
      action: 'start',
      label: '적응형 세션 시작',
    });
    expect(getAdaptiveSetupCtaState({ method: 'simulationEeg', museStatus: 'idle' })).toEqual({
      action: 'start',
      label: '적응형 세션 시작',
    });
  });
});
