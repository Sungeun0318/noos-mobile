import { describe, expect, it } from 'vitest';

import { fft, powerSpectrum } from '@/screens/measure/fft';

function sineWave(frequencyHz: number, sampleRateHz: number, sampleCount: number) {
  return Array.from({ length: sampleCount }, (_, index) => Math.sin(2 * Math.PI * frequencyHz * index / sampleRateHz));
}

describe('fft', () => {
  it('keeps DC energy in the zero-frequency bin', () => {
    const spectrum = powerSpectrum(new Array(256).fill(1), 256);
    const peak = spectrum.reduce((winner, bin) => (bin.power > winner.power ? bin : winner), spectrum[0]);

    expect(peak.frequencyHz).toBe(0);
  });

  it('finds the expected single-tone frequency bin', () => {
    const spectrum = powerSpectrum(sineWave(10, 256, 256), 256);
    const peak = spectrum.reduce((winner, bin) => (bin.power > winner.power ? bin : winner), spectrum[0]);

    expect(peak.frequencyHz).toBe(10);
  });

  it('rejects non power-of-two input length', () => {
    expect(() => fft([1, 2, 3])).toThrow('power of two');
  });
});
