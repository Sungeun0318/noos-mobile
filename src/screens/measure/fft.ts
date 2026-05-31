export interface ComplexArray {
  real: number[];
  imag: number[];
}

function isPowerOfTwo(value: number) {
  return value > 0 && (value & (value - 1)) === 0;
}

export function fft(realInput: number[]): ComplexArray {
  const n = realInput.length;

  if (!isPowerOfTwo(n)) {
    throw new Error('fft input length must be a power of two');
  }

  const real = [...realInput];
  const imag = new Array<number>(n).fill(0);

  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;

    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }

    j ^= bit;

    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const angle = -2 * Math.PI / len;
    const wLenReal = Math.cos(angle);
    const wLenImag = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let wReal = 1;
      let wImag = 0;

      for (let j = 0; j < len / 2; j += 1) {
        const uReal = real[i + j];
        const uImag = imag[i + j];
        const vReal = real[i + j + len / 2] * wReal - imag[i + j + len / 2] * wImag;
        const vImag = real[i + j + len / 2] * wImag + imag[i + j + len / 2] * wReal;

        real[i + j] = uReal + vReal;
        imag[i + j] = uImag + vImag;
        real[i + j + len / 2] = uReal - vReal;
        imag[i + j + len / 2] = uImag - vImag;

        const nextWReal = wReal * wLenReal - wImag * wLenImag;
        wImag = wReal * wLenImag + wImag * wLenReal;
        wReal = nextWReal;
      }
    }
  }

  return { imag, real };
}

export function powerSpectrum(samples: number[], sampleRateHz: number) {
  const { real, imag } = fft(samples);
  const binWidthHz = sampleRateHz / samples.length;
  const bins: Array<{ frequencyHz: number; power: number }> = [];

  for (let index = 0; index <= samples.length / 2; index += 1) {
    bins.push({
      frequencyHz: index * binWidthHz,
      power: (real[index] * real[index] + imag[index] * imag[index]) / samples.length,
    });
  }

  return bins;
}
