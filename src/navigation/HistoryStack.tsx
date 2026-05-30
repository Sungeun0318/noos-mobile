import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HistoryDetailScreen } from '@/screens/history/HistoryDetailScreen';
import { HistoryListScreen } from '@/screens/history/HistoryListScreen';
import { color } from '@/theme';

export type HistoryStackParamList = {
  'History/List': undefined;
  'History/Detail': { sessionId: string };
};

const Stack = createNativeStackNavigator<HistoryStackParamList>();

export function HistoryStack() {
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
        component={HistoryListScreen}
        name="History/List"
        options={{ title: 'History' }}
      />
      <Stack.Screen
        component={HistoryDetailScreen}
        name="History/Detail"
        options={{ title: 'Session Detail' }}
      />
    </Stack.Navigator>
  );
}
