import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { PlanetSelectScreen } from '@/screens/journey/PlanetSelectScreen';
import { color } from '@/theme';

export type JourneyStackParamList = {
  'Journey/PlanetSelect': undefined;
};

const Stack = createNativeStackNavigator<JourneyStackParamList>();

export function JourneyStack() {
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
        component={PlanetSelectScreen}
        name="Journey/PlanetSelect"
        options={{ title: 'Planet Select' }}
      />
    </Stack.Navigator>
  );
}
