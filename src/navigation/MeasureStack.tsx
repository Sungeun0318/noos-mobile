import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ManualStateScreen } from '@/screens/measure/ManualStateScreen';
import { MeasureHomeScreen } from '@/screens/measure/MeasureHomeScreen';
import { MeasureResultScreen } from '@/screens/measure/MeasureResultScreen';
import { MuseConnectScreen } from '@/screens/measure/MuseConnectScreen';
import { MuseMeasureScreen } from '@/screens/measure/MuseMeasureScreen';
import { color } from '@/theme';

export type MeasureStackParamList = {
  'Measure/Home': undefined;
  'Measure/Manual': undefined;
  'Measure/MuseConnect': undefined;
  'Measure/MuseMeasure': undefined;
  'Measure/Result': undefined;
};

const Stack = createNativeStackNavigator<MeasureStackParamList>();

export function MeasureStack() {
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
        component={MeasureHomeScreen}
        name="Measure/Home"
        options={{ title: 'Measure' }}
      />
      <Stack.Screen
        component={ManualStateScreen}
        name="Measure/Manual"
        options={{ title: 'Manual Measure' }}
      />
      <Stack.Screen
        component={MuseConnectScreen}
        name="Measure/MuseConnect"
        options={{ title: 'Muse Connect' }}
      />
      <Stack.Screen
        component={MuseMeasureScreen}
        name="Measure/MuseMeasure"
        options={{ title: 'Muse Measure' }}
      />
      <Stack.Screen
        component={MeasureResultScreen}
        name="Measure/Result"
        options={{ title: 'Result' }}
      />
    </Stack.Navigator>
  );
}
