import { beforeEach, describe, expect, it } from 'vitest';

import type { MeasureEeg, MeasureResponse } from '@/api/types';
import {
  normalizePlanetId,
  normalizeSurveyDraft,
  normalizeSurveyValue,
  useStateStore,
} from '@/stores/stateStore';

import { __resetMMKV } from './mocks/react-native-mmkv';

const response: MeasureResponse = {
  measurementId: 'meas_test',
  stateLabel: 'calm focus',
  currentState: {
    focus_readiness: 0.7,
    stress_load: 0.2,
    fatigue_risk: 0.3,
    relaxation_level: 0.6,
    cortical_arousal: 0.5,
    mental_workload: 0.4,
  },
  recommendedPlanet: 'Neptune',
  alternates: ['Saturn', 'Earth', 'Unknown'],
  confidence: 0.78,
  source: 'survey',
  weight: { survey: 1, eeg: 0 },
  measuredAt: '2026-05-20T01:00:00Z',
};

const eeg: MeasureEeg = {
  deviceType: 'Muse S Athena',
  deviceId: 'muse_test',
  measuredAt: '2026-05-20T01:00:00Z',
  measurementDurationSec: 60,
  sampleRateHz: 256,
  sampleCount: 15360,
  signalQuality: 0.84,
  bands: {
    alpha: 28.2,
    beta: 31.5,
    delta: 12.3,
    gamma: 9.6,
    theta: 18.4,
  },
};

describe('stateStore', () => {
  beforeEach(() => {
    __resetMMKV();
    useStateStore.getState().clear();
  });

  it('normalizes survey values with 0.5 fallback and clamps out-of-range values', () => {
    expect(normalizeSurveyValue(undefined)).toBe(0.5);
    expect(normalizeSurveyValue(Number.NaN)).toBe(0.5);
    expect(normalizeSurveyValue(-1)).toBe(0);
    expect(normalizeSurveyValue(2)).toBe(1);
  });

  it('normalizes survey draft and trims intent text', () => {
    expect(
      normalizeSurveyDraft({
        focus: null,
        stress: 0.2,
        fatigue: undefined,
        relaxation: 1.2,
        intentText: '  집중  ',
      }),
    ).toEqual({
      focus: 0.5,
      stress: 0.2,
      fatigue: 0.5,
      relaxation: 1,
      intentText: '집중',
    });
  });

  it('normalizes backend planet casing and falls back to neptune', () => {
    expect(normalizePlanetId('Neptune')).toBe('neptune');
    expect(normalizePlanetId('MARS')).toBe('mars');
    expect(normalizePlanetId('unknown')).toBe('neptune');
  });

  it('stores survey draft, measure response, and clears state', () => {
    useStateStore.getState().setSurveyDraft({ focus: 0.8, stress: 0.1, intentText: '  code  ' });
    useStateStore.getState().setFromMeasure(response);

    expect(useStateStore.getState()).toMatchObject({
      surveyDraft: {
        focus: 0.8,
        stress: 0.1,
        fatigue: 0.5,
        relaxation: 0.5,
        intentText: 'code',
      },
      measurementId: 'meas_test',
      stateLabel: 'calm focus',
      recommendedPlanet: 'neptune',
      alternates: ['saturn', 'earth', 'neptune'],
      confidence: 0.78,
      source: 'survey',
      eegBands: null,
      intentText: 'code',
    });

    useStateStore.getState().clear();

    expect(useStateStore.getState()).toMatchObject({
      surveyDraft: null,
      currentState: null,
      stateLabel: null,
      measurementId: null,
      recommendedPlanet: null,
      alternates: [],
      eegBands: null,
    });
  });

  it('stores EEG bands for EEG-backed measurements and clears them for survey-only measurements', () => {
    useStateStore.getState().setFromMeasure({ ...response, source: 'hybrid' }, eeg);

    expect(useStateStore.getState().eegBands).toEqual(eeg.bands);

    useStateStore.getState().setFromMeasure(response);

    expect(useStateStore.getState().eegBands).toBeNull();
  });

  it('clears stale survey draft for EEG-only Muse measurement', () => {
    useStateStore.getState().setSurveyDraft({ focus: 0.8, stress: 0.1, intentText: '  code  ' });

    useStateStore.getState().setSurveyDraft(null);

    expect(useStateStore.getState().surveyDraft).toBeNull();
  });
});
