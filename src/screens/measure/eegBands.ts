import type { MeasureEeg } from '@/api/types';
import { powerSpectrum } from '@/screens/measure/fft';

export type EegBands = MeasureEeg['bands'];

const bands = {
  alpha: [8, 13],
  beta: [13, 30],
  delta: [1, 4],
  gamma: [30, 44],
  theta: [4, 8],
} satisfies Record<keyof EegBands, [number, number]>;

const defaultWindowSize = 256;

function nextLowerPowerOfTwo(value: number) {
  if (value < 2) {
    return 0;
  }

  return 2 ** Math.floor(Math.log2(value));
}

function mean(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function removeMean(samples: number[]) {
  const average = mean(samples);
  return samples.map((sample) => sample - average);
}

function hannWindow(samples: number[]) {
  if (samples.length <= 1) {
    return samples;
  }

  return samples.map((sample, index) => sample * 0.5 * (1 - Math.cos(2 * Math.PI * index / (samples.length - 1))));
}

function emptyBands(): EegBands {
  return { alpha: 0, beta: 0, delta: 0, gamma: 0, theta: 0 };
}

function bandPower(samples: number[], sampleRateHz: number, range: [number, number]) {
  const spectrum = powerSpectrum(hannWindow(removeMean(samples)), sampleRateHz);
  const matchingBins = spectrum.filter((bin) => bin.frequencyHz >= range[0] && bin.frequencyHz < range[1]);

  return matchingBins.reduce((sum, bin) => sum + bin.power, 0);
}

export function calculateBandPowers(
  channels: number[][],
  sampleRateHz: number,
  windowSize = defaultWindowSize,
): EegBands {
  const safeWindowSize = nextLowerPowerOfTwo(windowSize);
  const totals = emptyBands();
  let windowCount = 0;

  if (safeWindowSize === 0) {
    return totals;
  }

  channels.forEach((channel) => {
    for (let start = 0; start + safeWindowSize <= channel.length; start += safeWindowSize) {
      const window = channel.slice(start, start + safeWindowSize);

      (Object.keys(bands) as Array<keyof EegBands>).forEach((band) => {
        totals[band] += bandPower(window, sampleRateHz, bands[band]);
      });

      windowCount += 1;
    }
  });

  if (windowCount === 0) {
    return totals;
  }

  (Object.keys(totals) as Array<keyof EegBands>).forEach((band) => {
    totals[band] = Number((totals[band] / windowCount).toFixed(3));
  });

  return totals;
}

export function dominantBand(bandsInput: EegBands) {
  return (Object.keys(bandsInput) as Array<keyof EegBands>).reduce((winner, band) =>
    bandsInput[band] > bandsInput[winner] ? band : winner,
  'delta');
}
