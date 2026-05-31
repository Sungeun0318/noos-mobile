import { describe, expect, it } from 'vitest';

import {
  base64ToBytes,
  bytesToHex,
  bytesToBase64,
  createAthenaPacketReassembler,
  parseAthenaDataPacket,
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

  it('formats bytes as hex for Muse packet diagnostics', () => {
    expect(bytesToHex(Uint8Array.from([0, 15, 16, 255]))).toBe('000f10ff');
  });

  it('reassembles fragmented Athena packets before parsing', () => {
    const packet = new Uint8Array(42);
    packet[0] = 42;
    packet[9] = 0x11;
    const reassembler = createAthenaPacketReassembler();

    expect(reassembler.append(packet.subarray(0, 20))).toMatchObject({
      bufferLength: 20,
      completedPackets: [],
      droppedBytes: 0,
    });
    expect(reassembler.append(packet.subarray(20, 40))).toMatchObject({
      bufferLength: 40,
      completedPackets: [],
      droppedBytes: 0,
    });

    const result = reassembler.append(packet.subarray(40));

    expect(result.bufferLength).toBe(0);
    expect(result.completedPackets).toHaveLength(1);
    expect(parseAthenaDataPacket(result.completedPackets[0])).toMatchObject({
      eegRows: expect.arrayContaining([expect.arrayContaining([0])]),
      packetTags: ['0x11'],
    });
  });

  it('drops invalid leading bytes while reassembling Athena packets', () => {
    const packet = new Uint8Array(42);
    packet[0] = 42;
    packet[9] = 0x11;

    const result = createAthenaPacketReassembler().append(Uint8Array.from([0, ...packet]));

    expect(result.droppedBytes).toBe(1);
    expect(result.completedPackets).toHaveLength(1);
  });
});
