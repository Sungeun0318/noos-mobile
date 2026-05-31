import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(rootDir, 'src'),
      'react-native': resolve(rootDir, 'tests/mocks/react-native.ts'),
      'react-native-mmkv': resolve(rootDir, 'tests/mocks/react-native-mmkv.ts'),
      'react-native-reanimated': resolve(rootDir, 'tests/mocks/react-native-reanimated.ts'),
    },
  },
  test: {
    globals: true,
  },
});
