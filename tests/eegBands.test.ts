import { describe, expect, it } from 'vitest';

import { calculateBandPowers, dominantBand } from '@/screens/measure/eegBands';

function sineWave(frequencyHz: number, sampleRateHz: number, sampleCount: number) {
  return Array.from({ length: sampleCount }, (_, index) => Math.sin(2 * Math.PI * frequencyHz * index / sampleRateHz));
}

describe('calculateBandPowers', () => {
  it('puts 10Hz energy in alpha band', () => {
    const signal = sineWave(10, 256, 256);
    const bands = calculateBandPowers([signal, signal, signal, signal], 256);

    expect(dominantBand(bands)).toBe('alpha');
    expect(bands.alpha).toBeGreaterThan(bands.theta);
    expect(bands.alpha).toBeGreaterThan(bands.beta);
  });

  it('puts 20Hz energy in beta band', () => {
    const signal = sineWave(20, 256, 256);
    const bands = calculateBandPowers([signal], 256);

    expect(dominantBand(bands)).toBe('beta');
    expect(bands.beta).toBeGreaterThan(bands.alpha);
  });

  it('returns zeros when there are not enough samples for one window', () => {
    expect(calculateBandPowers([[1, 2, 3]], 256)).toEqual({
      alpha: 0,
      beta: 0,
      delta: 0,
      gamma: 0,
      theta: 0,
    });
  });
});
