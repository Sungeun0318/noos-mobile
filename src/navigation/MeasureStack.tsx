import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ManualStateScreen } from '@/screens/measure/ManualStateScreen';
import { MeasureResultScreen } from '@/screens/measure/MeasureResultScreen';
import { color } from '@/theme';

export type MeasureStackParamList = {
  'Measure/Manual': undefined;
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
        component={ManualStateScreen}
        name="Measure/Manual"
        options={{ title: 'Manual Measure' }}
      />
      <Stack.Screen
        component={MeasureResultScreen}
        name="Measure/Result"
        options={{ title: 'Result' }}
      />
    </Stack.Navigator>
  );
}
