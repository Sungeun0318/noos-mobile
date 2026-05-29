type MockGlobal = typeof globalThis & {
  __noosMockMMKVStores?: Map<string, Map<string, string>>;
};

const mockGlobal = globalThis as MockGlobal;
const stores = mockGlobal.__noosMockMMKVStores ?? new Map<string, Map<string, string>>();
mockGlobal.__noosMockMMKVStores = stores;

class MockMMKV {
  private storage: Map<string, string>;

  constructor({ id = 'default' }: { id?: string } = {}) {
    const existing = stores.get(id);

    if (existing) {
      this.storage = existing;
    } else {
      this.storage = new Map();
      stores.set(id, this.storage);
    }
  }

  getString(key: string) {
    return this.storage.get(key);
  }

  set(key: string, value: string) {
    this.storage.set(key, value);
  }

  remove(key: string) {
    this.storage.delete(key);
  }
}

export function createMMKV(config: { id?: string } = {}) {
  return new MockMMKV(config);
}

export function __resetMMKV() {
  stores.clear();
}

export function __getMMKVStore(id = 'default') {
  let storage = stores.get(id);

  if (!storage) {
    storage = new Map();
    stores.set(id, storage);
  }

  return storage;
}
