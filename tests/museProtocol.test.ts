import { describe, expect, it } from 'vitest';

import {
  base64ToBytes,
  bytesToBase64,
  decodeClassicEegPacket,
  decodeUnsigned12BitSamples,
  encodeMuseCommand,
} from '@/screens/measure/museProtocol';

describe('museProtocol', () => {
  it('round-trips bytes through base64', () => {
    const bytes = Uint8Array.from([0, 1, 2, 253, 254, 255]);

    expect(Array.from(base64ToBytes(bytesToBase64(bytes)))).toEqual(Array.from(bytes));
  });

  it('encodes Muse commands with length prefix and newline', () => {
    const bytes = base64ToBytes(encodeMuseCommand('h'));

    expect(Array.from(bytes)).toEqual([2, 'h'.charCodeAt(0), '\n'.charCodeAt(0)]);
  });

  it('decodes unsigned 12-bit packed samples', () => {
    expect(Array.from(decodeUnsigned12BitSamples(Uint8Array.from([0x80, 0x00, 0x80])))).toEqual([2048, 128]);
  });

  it('decodes classic EEG packets after the two-byte index', () => {
    const samples = decodeClassicEegPacket(Uint8Array.from([0, 1, 0x80, 0x00, 0x80]));

    expect(samples[0]).toBe(0);
    expect(samples[1]).toBeLessThan(0);
  });
});
