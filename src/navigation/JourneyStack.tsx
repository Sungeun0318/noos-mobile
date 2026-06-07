import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AdaptivePlayerScreen } from '@/screens/journey/AdaptivePlayerScreen';
import { AdaptiveSessionSetupScreen } from '@/screens/journey/AdaptiveSessionSetupScreen';
import { FeedbackScreen } from '@/screens/journey/FeedbackScreen';
import { PlanetSelectScreen } from '@/screens/journey/PlanetSelectScreen';
import { PlayerScreen } from '@/screens/journey/PlayerScreen';
import { SessionPendingScreen } from '@/screens/journey/SessionPendingScreen';
import type { PlanetId } from '@/theme';
import { color } from '@/theme';

export type JourneyStackParamList = {
  'Journey/PlanetSelect': undefined;
  'Journey/AdaptiveSetup': { recommendedPlanet?: PlanetId } | undefined;
  'Journey/PendingSession': { sessionId: string };
  'Journey/Player': { sessionId: string };
  'Journey/AdaptivePlayer': { sessionId: string };
  'Journey/Feedback': { sessionId: string };
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
      <Stack.Screen
        component={AdaptiveSessionSetupScreen}
        name="Journey/AdaptiveSetup"
        options={{ title: 'Adaptive Setup' }}
      />
      <Stack.Screen
        component={SessionPendingScreen}
        name="Journey/PendingSession"
        options={{ title: 'Generating' }}
      />
      <Stack.Screen
        component={PlayerScreen}
        name="Journey/Player"
        options={{ title: 'Player' }}
      />
      <Stack.Screen
        component={AdaptivePlayerScreen}
        name="Journey/AdaptivePlayer"
        options={{ title: 'Adaptive Player' }}
      />
      <Stack.Screen
        component={FeedbackScreen}
        name="Journey/Feedback"
        options={{ title: 'Feedback' }}
      />
    </Stack.Navigator>
  );
}
