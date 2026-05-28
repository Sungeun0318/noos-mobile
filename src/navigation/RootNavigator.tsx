import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsStack } from '@/navigation/SettingsStack';
import { SplashScreen } from '@/screens/splash/SplashScreen';
import { color, space, type } from '@/theme';

type RootStackParamList = {
  Splash: undefined;
  MainTabs: undefined;
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
      {tabLabels.map((label) =>
        label === 'Settings' ? (
          <Tabs.Screen component={SettingsStack} key={label} name={label} />
        ) : (
          <Tabs.Screen key={label} name={label}>
            {() => <PlaceholderScreen label={label} />}
          </Tabs.Screen>
        ),
      )}
    </Tabs.Navigator>
  );
}

function SplashGate({ navigation }: { navigation: { replace: (screen: 'MainTabs') => void } }) {
  useEffect(() => {
    const timer = setTimeout(() => navigation.replace('MainTabs'), 1000);

    return () => clearTimeout(timer);
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
