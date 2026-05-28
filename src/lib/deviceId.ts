import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV({ id: 'noos.device.v1' });
const deviceIdKey = 'deviceId';

function randomHex(length: number) {
  let out = '';

  for (let i = 0; i < length; i += 1) {
    out += Math.floor(Math.random() * 16).toString(16);
  }

  return out;
}

export function createDeviceId() {
  return `dev_${randomHex(8)}-${randomHex(4)}-${randomHex(4)}-${randomHex(4)}-${randomHex(12)}`;
}

export function getOrCreateDeviceId() {
  const existing = storage.getString(deviceIdKey);

  if (existing) {
    return existing;
  }

  const next = createDeviceId();
  storage.set(deviceIdKey, next);
  return next;
}
