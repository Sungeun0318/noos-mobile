import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { createMMKV } from 'react-native-mmkv';

const legacyStorage = createMMKV({ id: 'noos.device.v1' });
const deviceIdKey = 'deviceId';

export function createDeviceId() {
  return `dev_${Crypto.randomUUID()}`;
}

export async function getOrCreateDeviceId() {
  const existing = await SecureStore.getItemAsync(deviceIdKey);

  if (existing) {
    return existing;
  }

  const legacy = legacyStorage.getString(deviceIdKey);

  if (legacy) {
    await SecureStore.setItemAsync(deviceIdKey, legacy);
    legacyStorage.remove(deviceIdKey);
    return legacy;
  }

  const next = createDeviceId();
  await SecureStore.setItemAsync(deviceIdKey, next);
  return next;
}
