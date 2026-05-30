import { NavigationContainer, DarkTheme, type NavigatorScreenParams } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { logger } from '@/lib/logger';
import { subscribeNetInfo } from '@/lib/netinfo';
import { noosTelemetry } from '@/lib/telemetry';
import { AuthStack, type AuthStackParamList } from '@/navigation/AuthStack';
import { JourneyStack } from '@/navigation/JourneyStack';
import { MeasureStack } from '@/navigation/MeasureStack';
import { SettingsStack } from '@/navigation/SettingsStack';
import { SplashScreen } from '@/screens/splash/SplashScreen';
import { TodayScreen } from '@/screens/today/TodayScreen';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { color, space, type } from '@/theme';

type RootStackParamList = {
  Splash: undefined;
  MainTabs: undefined;
  'Settings/Home': undefined;
  Auth: NavigatorScreenParams<AuthStackParamList>;
};

type MainTabsParamList = {
  Today: undefined;
  Measure: undefined;
  Journey: undefined;
  History: undefined;
  Settings: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabsParamList>();

const tabLabels: Array<keyof MainTabsParamList> = [
  'Today',
  'Measure',
  'Journey',
  'History',
  'Settings',
];

function PlaceholderScreen({ label }: { label: string }) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>{label}</Text>
    </View>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.text.primary,
        tabBarInactiveTintColor: color.text.tertiary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 56 + insets.bottom,
            paddingBottom: insets.bottom,
          },
        ],
      }}
    >
      {tabLabels.map((label) => {
        if (label === 'Today') {
          return <Tabs.Screen component={TodayScreen} key={label} name={label} />;
        }

        if (label === 'Measure') {
          return <Tabs.Screen component={MeasureStack} key={label} name={label} />;
        }

        if (label === 'Journey') {
          return <Tabs.Screen component={JourneyStack} key={label} name={label} />;
        }

        return label === 'Settings' ? (
          <Tabs.Screen component={SettingsStack} key={label} name={label} />
        ) : (
          <Tabs.Screen key={label} name={label}>
            {() => <PlaceholderScreen label={label} />}
          </Tabs.Screen>
        );
      })}
    </Tabs.Navigator>
  );
}

const log = logger.create('RootNavigator');
const splashMaxMs = 1000;

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function bootAction(name: string, action: () => Promise<void> | void) {
  return Promise.resolve()
    .then(action)
    .catch((error: unknown) => {
      log.warn('boot action failed', {
        name,
        code: error instanceof Error ? error.message : 'UNKNOWN',
      });
    });
}

function SplashGate({
  navigation,
}: {
  navigation: { replace: (screen: 'MainTabs' | 'Settings/Home') => void };
}) {
  useEffect(() => {
    let active = true;
    const startedAt = Date.now();
    const boot = Promise.all([
      bootAction('auth.bootstrap', () => useAuthStore.getState().bootstrap()),
      bootAction('settings.rehydrate', () => useSettingsStore.persist.rehydrate()),
      bootAction('netinfo.subscribe', () => {
        subscribeNetInfo();
      }),
      // FE-07/FE-11 범위: pending session polling resume / push token sync.
    ]);

    Promise.race([boot, delay(splashMaxMs)]).then(() => {
      if (!active) {
        return;
      }

      const ms = Date.now() - startedAt;
      const mode = useAuthStore.getState().mode;
      noosTelemetry.track('boot_complete', { ms, mode });
      navigation.replace(useSettingsStore.getState().backendBaseUrl ? 'MainTabs' : 'Settings/Home');
    });

    return () => {
      active = false;
    };
  }, [navigation]);

  return <SplashScreen />;
}

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: color.bg.base,
    border: color.border.subtle,
    card: color.bg.surface,
    primary: color.brand.accent,
    text: color.text.primary,
  },
};

export function RootNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Splash" component={SplashGate} />
        <RootStack.Screen name="MainTabs" component={MainTabs} />
        <RootStack.Screen name="Settings/Home" component={SettingsStack} />
        <RootStack.Screen
          name="Auth"
          component={AuthStack}
          options={{ presentation: 'modal' }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    backgroundColor: color.bg.base,
    flex: 1,
    justifyContent: 'center',
    padding: space.xl,
  },
  placeholderText: {
    color: color.text.primary,
    fontFamily: type.h1.family,
    fontSize: type.h1.size,
    fontWeight: type.h1.weight,
    letterSpacing: 0,
    lineHeight: type.h1.lineHeight,
  },
  tabBar: {
    backgroundColor: color.bg.surface,
    borderTopColor: color.border.subtle,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space.xs,
  },
  tabLabel: {
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    lineHeight: type.caption.lineHeight,
  },
});
