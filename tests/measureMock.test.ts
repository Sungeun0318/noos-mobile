import { afterEach, describe, expect, it, vi } from 'vitest';

import { measureMock } from '@/screens/measure/measureMock';

describe('measureMock', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a measure DTO shaped response for survey input', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_800_000);

    const response = await measureMock(
      {
        focus: 0.7,
        stress: 0.2,
        fatigue: 0.3,
        relaxation: 0.6,
        intentText: '집중',
      },
      0,
    );

    expect(response).toMatchObject({
      measurementId: 'mock_meas_1800',
      stateLabel: 'calm focus',
      recommendedPlanet: 'Mars',
      alternates: ['Mercury', 'Earth'],
      confidence: 0.76,
      source: 'survey',
      weight: { survey: 1, eeg: 0 },
    });
    expect(response.currentState).toEqual(
      expect.objectContaining({
        focus_readiness: 0.7,
        stress_load: 0.2,
        fatigue_risk: 0.3,
        relaxation_level: 0.6,
      }),
    );
    expect(response.measuredAt).toEqual(expect.any(String));
  });

  it('recommends recovery for high stress or fatigue', async () => {
    const response = await measureMock({ stress: 0.9, fatigue: 0.8 }, 0);

    expect(response.stateLabel).toBe('overloaded recovery');
    expect(response.recommendedPlanet).toBe('Neptune');
  });

  it('uses hybrid source and EEG weight when EEG is present with survey', async () => {
    const response = await measureMock(
      { focus: 0.5, stress: 0.4, fatigue: 0.3, relaxation: 0.5 },
      {
        bands: {
          alpha: 28,
          beta: 22,
          delta: 11,
          gamma: 9,
          theta: 18,
        },
        deviceId: 'muse-sim',
        deviceType: 'Muse S Athena',
        measuredAt: '2026-05-30T01:00:00Z',
        measurementDurationSec: 60,
        sampleCount: 15360,
        sampleRateHz: 256,
        signalQuality: 0.88,
      },
      0,
    );

    expect(response.source).toBe('hybrid');
    expect(response.weight).toEqual({ survey: 0.45, eeg: 0.55 });
    expect(response.confidence).toBe(0.82);
  });

  it('uses eeg source when only EEG is present', async () => {
    const response = await measureMock(null, {
      bands: {
        alpha: 28,
        beta: 22,
        delta: 11,
        gamma: 9,
        theta: 18,
      },
      deviceId: 'muse-sim',
      deviceType: 'Muse S Athena',
      measuredAt: '2026-05-30T01:00:00Z',
      measurementDurationSec: 60,
      sampleCount: 15360,
      sampleRateHz: 256,
      signalQuality: 0.88,
    }, 0);

    expect(response.source).toBe('eeg');
  });
});
