import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'NOOS',
  slug: 'noos-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  scheme: 'noos',
  ios: {
    bundleIdentifier: 'ai.noos.mobile',
    supportsTablet: true,
    infoPlist: {
      NSBluetoothAlwaysUsageDescription:
        'NOOS가 Muse 기기와 연결해 뇌파 측정을 진행하려면 Bluetooth 접근이 필요합니다.',
      UIBackgroundModes: ['audio', 'bluetooth-central'],
    },
  },
  android: {
    package: 'ai.noos.mobile',
    adaptiveIcon: {
      backgroundColor: '#0A0B12',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    defaultBackendUrl: process.env.EXPO_PUBLIC_DEFAULT_BACKEND_URL ?? '',
  },
  plugins: [
    'expo-dev-client',
    'expo-secure-store',
    'expo-audio',
    [
      'react-native-ble-plx',
      {
        bluetoothAlwaysPermission:
          'NOOS가 Muse 기기와 연결해 뇌파 측정을 진행하려면 Bluetooth 접근이 필요합니다.',
        isBackgroundEnabled: true,
        modes: ['central'],
        neverForLocation: true,
      },
    ],
  ],
};

export default config;
