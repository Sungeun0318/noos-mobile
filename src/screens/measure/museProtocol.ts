export const museServiceUuid = '0000fe8d-0000-1000-8000-00805f9b34fb';
export const controlCharacteristicUuid = '273e0001-4c4d-454d-96be-f03bac821358';
export const eegCharacteristicUuids = [
  '273e0003-4c4d-454d-96be-f03bac821358',
  '273e0004-4c4d-454d-96be-f03bac821358',
  '273e0005-4c4d-454d-96be-f03bac821358',
  '273e0006-4c4d-454d-96be-f03bac821358',
] as const;
export const athenaDataCharacteristicUuids = [
  '273e0013-4c4d-454d-96be-f03bac821358',
  '273e0014-4c4d-454d-96be-f03bac821358',
  '273e0015-4c4d-454d-96be-f03bac821358',
] as const;

const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const eegScale = 0.48828125;
const eegOffset = 0x800;
const athenaEegScale = 1450 / 16383;
const athenaPacketHeaderSize = 14;
const athenaSubpacketHeaderSize = 5;
const athenaSensorConfig: Record<number, { type: 'EEG' | 'OTHER'; channelCount?: number; sampleCount?: number; dataLength: number }> = {
  0x11: { channelCount: 4, dataLength: 28, sampleCount: 4, type: 'EEG' },
  0x12: { channelCount: 8, dataLength: 28, sampleCount: 2, type: 'EEG' },
  0x34: { dataLength: 30, type: 'OTHER' },
  0x35: { dataLength: 40, type: 'OTHER' },
  0x36: { dataLength: 40, type: 'OTHER' },
  0x47: { dataLength: 36, type: 'OTHER' },
  0x53: { dataLength: 24, type: 'OTHER' },
  0x88: { dataLength: 188, type: 'OTHER' },
  0x98: { dataLength: 20, type: 'OTHER' },
};

export interface AthenaParseResult {
  eegRows: number[][];
  packetTags: string[];
}

export function bytesToBase64(bytes: Uint8Array) {
  let output = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const combined = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);

    output += base64Chars[(combined >> 18) & 63];
    output += base64Chars[(combined >> 12) & 63];
    output += second === undefined ? '=' : base64Chars[(combined >> 6) & 63];
    output += third === undefined ? '=' : base64Chars[combined & 63];
  }

  return output;
}

export function base64ToBytes(base64: string) {
  const sanitized = base64.replace(/=+$/, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const char of sanitized) {
    const value = base64Chars.indexOf(char);

    if (value === -1) {
      continue;
    }

    buffer = (buffer << 6) | value;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  return Uint8Array.from(bytes);
}

export function encodeMuseCommand(command: string) {
  const text = `X${command}\n`;
  const bytes = new Uint8Array(text.length);

  for (let index = 0; index < text.length; index += 1) {
    bytes[index] = text.charCodeAt(index);
  }

  bytes[0] = bytes.length - 1;
  return bytesToBase64(bytes);
}

export function decodeControlText(base64: string) {
  const bytes = base64ToBytes(base64);

  if (bytes.length === 0) {
    return '';
  }

  const payloadLength = bytes[0];
  const payload =
    payloadLength > 0 && payloadLength <= bytes.length - 1
      ? bytes.subarray(1, 1 + payloadLength)
      : bytes;

  return String.fromCharCode(...payload);
}

export function decodeUnsigned12BitSamples(bytes: Uint8Array) {
  const samples: number[] = [];

  for (let index = 0; index + 1 < bytes.length; index += 1) {
    if (index % 3 === 0) {
      samples.push((bytes[index] << 4) | (bytes[index + 1] >> 4));
    } else {
      samples.push(((bytes[index] & 0x0f) << 8) | bytes[index + 1]);
      index += 1;
    }
  }

  return samples;
}

export function decodeClassicEegPacket(bytes: Uint8Array) {
  return decodeUnsigned12BitSamples(bytes.subarray(2)).map((sample) => eegScale * (sample - eegOffset));
}

function bytesToBits(bytes: Uint8Array, byteCount: number) {
  const bits: number[] = [];
  const limit = Math.min(bytes.length, byteCount);

  for (let byteIndex = 0; byteIndex < limit; byteIndex += 1) {
    const byte = bytes[byteIndex];

    for (let bitIndex = 0; bitIndex < 8; bitIndex += 1) {
      bits.push((byte >> bitIndex) & 1);
    }
  }

  return bits;
}

function extractPackedInt(bits: number[], bitStart: number, bitWidth: number) {
  let value = 0;

  for (let bitIndex = 0; bitIndex < bitWidth; bitIndex += 1) {
    if (bits[bitStart + bitIndex]) {
      value |= 1 << bitIndex;
    }
  }

  return value;
}

export function decodeAthenaEegData(dataBytes: Uint8Array, channelCount: number) {
  if (dataBytes.length < 28) {
    return [];
  }

  const sampleCount = channelCount === 4 ? 4 : 2;
  const bits = bytesToBits(dataBytes, 28);
  const rows: number[][] = [];

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const row: number[] = [];

    for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
      const bitStart = (sampleIndex * channelCount + channelIndex) * 14;
      const rawValue = extractPackedInt(bits, bitStart, 14);
      row.push(rawValue * athenaEegScale);
    }

    rows.push(row);
  }

  return rows;
}

export function parseAthenaDataPacket(payload: Uint8Array): AthenaParseResult {
  const eegRows: number[][] = [];
  const packetTags: string[] = [];
  let offset = 0;

  while (offset < payload.length) {
    if (offset + athenaPacketHeaderSize > payload.length) {
      break;
    }

    const packetLength = payload[offset];
    if (!packetLength || offset + packetLength > payload.length) {
      break;
    }

    const packet = payload.subarray(offset, offset + packetLength);
    const packetTag = packet[9];
    const packetConfig = athenaSensorConfig[packetTag];
    const packetData = packet.subarray(athenaPacketHeaderSize);
    let dataOffset = 0;

    packetTags.push(`0x${packetTag.toString(16).padStart(2, '0')}`);

    if (packetConfig?.dataLength) {
      const dataEnd = dataOffset + packetConfig.dataLength;

      if (dataEnd <= packetData.length) {
        if (packetConfig.type === 'EEG' && packetConfig.channelCount) {
          eegRows.push(...decodeAthenaEegData(packetData.subarray(dataOffset, dataEnd), packetConfig.channelCount));
        }

        dataOffset = dataEnd;
      }
    }

    while (dataOffset + athenaSubpacketHeaderSize <= packetData.length) {
      const tag = packetData[dataOffset];
      const config = athenaSensorConfig[tag];

      if (!config?.dataLength) {
        break;
      }

      const dataStart = dataOffset + athenaSubpacketHeaderSize;
      const dataEnd = dataStart + config.dataLength;

      if (dataEnd > packetData.length) {
        break;
      }

      packetTags.push(`0x${tag.toString(16).padStart(2, '0')}`);

      if (config.type === 'EEG' && config.channelCount) {
        eegRows.push(...decodeAthenaEegData(packetData.subarray(dataStart, dataEnd), config.channelCount));
      }

      dataOffset = dataEnd;
    }

    offset += packetLength;
  }

  return { eegRows, packetTags };
}
