import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { BackendUrlScreen } from '@/screens/settings/BackendUrlScreen';
import { SettingsHomeScreen } from '@/screens/settings/SettingsHomeScreen';
import { color } from '@/theme';

export type SettingsStackParamList = {
  'Settings/Home': undefined;
  'Settings/BackendUrl': undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: color.bg.base },
        headerStyle: { backgroundColor: color.bg.surface },
        headerTintColor: color.text.primary,
        headerTitleStyle: { color: color.text.primary },
      }}
    >
      <Stack.Screen
        component={SettingsHomeScreen}
        name="Settings/Home"
        options={{ title: 'Settings' }}
      />
      <Stack.Screen
        component={BackendUrlScreen}
        name="Settings/BackendUrl"
        options={{ title: 'Backend URL' }}
      />
    </Stack.Navigator>
  );
}
