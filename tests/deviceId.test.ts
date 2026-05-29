import { beforeEach, describe, expect, it, vi } from 'vitest';

import { __getMMKVStore, __resetMMKV } from './mocks/react-native-mmkv';

const secureStore = vi.hoisted(() => new Map<string, string>());
const randomUUID = vi.hoisted(() => vi.fn(() => '00000000-0000-4000-8000-000000000001'));

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn((key: string) => Promise.resolve(secureStore.get(key) ?? null)),
  setItemAsync: vi.fn((key: string, value: string) => {
    secureStore.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: vi.fn((key: string) => {
    secureStore.delete(key);
    return Promise.resolve();
  }),
}));

vi.mock('expo-crypto', () => ({
  randomUUID,
}));

describe('deviceId', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    secureStore.clear();
    __resetMMKV();
    randomUUID.mockReturnValue('00000000-0000-4000-8000-000000000001');
  });

  it('returns the SecureStore deviceId without generating or reading legacy MMKV', async () => {
    secureStore.set('deviceId', 'dev_existing');
    __getMMKVStore('noos.device.v1').set('deviceId', 'dev_legacy');

    const { getOrCreateDeviceId } = await import('@/lib/deviceId');
    const SecureStore = await import('expo-secure-store');
    const { createMMKV } = await import('react-native-mmkv');
    const legacyStorage = createMMKV({ id: 'noos.device.v1' });

    await expect(getOrCreateDeviceId()).resolves.toBe('dev_existing');
    expect(randomUUID).not.toHaveBeenCalled();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(legacyStorage.getString('deviceId')).toBe('dev_legacy');
  });

  it('migrates legacy MMKV deviceId into SecureStore', async () => {
    __getMMKVStore('noos.device.v1').set('deviceId', 'dev_legacy');

    const { getOrCreateDeviceId } = await import('@/lib/deviceId');
    const SecureStore = await import('expo-secure-store');
    const { createMMKV } = await import('react-native-mmkv');
    const legacyStorage = createMMKV({ id: 'noos.device.v1' });

    await expect(getOrCreateDeviceId()).resolves.toBe('dev_legacy');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('deviceId', 'dev_legacy');
    expect(secureStore.get('deviceId')).toBe('dev_legacy');
    expect(legacyStorage.getString('deviceId')).toBeUndefined();
  });

  it('creates and stores a dev_ prefixed UUID when no stored deviceId exists', async () => {
    const { getOrCreateDeviceId } = await import('@/lib/deviceId');
    const SecureStore = await import('expo-secure-store');

    await expect(getOrCreateDeviceId()).resolves.toBe(
      'dev_00000000-0000-4000-8000-000000000001',
    );
    expect(randomUUID).toHaveBeenCalledTimes(1);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'deviceId',
      'dev_00000000-0000-4000-8000-000000000001',
    );
  });
});
