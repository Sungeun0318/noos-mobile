import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AdaptiveFeedbackScreen } from '@/screens/journey/AdaptiveFeedbackScreen';
import { AdaptivePlayerScreen } from '@/screens/journey/AdaptivePlayerScreen';
import { AdaptiveSessionSetupScreen } from '@/screens/journey/AdaptiveSessionSetupScreen';
import { AdaptiveSummaryScreen } from '@/screens/journey/AdaptiveSummaryScreen';
import { FeedbackScreen } from '@/screens/journey/FeedbackScreen';
import { JourneyHomeScreen } from '@/screens/journey/JourneyHomeScreen';
import { PlanetSelectScreen } from '@/screens/journey/PlanetSelectScreen';
import { PlayerScreen } from '@/screens/journey/PlayerScreen';
import { SessionPendingScreen } from '@/screens/journey/SessionPendingScreen';
import type { PlanetId } from '@/theme';
import { color } from '@/theme';

export type JourneyStackParamList = {
  'Journey/Home': undefined;
  'Journey/PlanetSelect': undefined;
  'Journey/AdaptiveSetup': { recommendedPlanet?: PlanetId } | undefined;
  'Journey/PendingSession': { sessionId: string };
  'Journey/Player': { sessionId: string };
  'Journey/AdaptivePlayer': { sessionId: string };
  'Journey/AdaptiveFeedback': { sessionId: string };
  'Journey/AdaptiveSummary': { sessionId: string };
  'Journey/Feedback': { sessionId: string };
};

const Stack = createNativeStackNavigator<JourneyStackParamList>();

export function JourneyStack() {
  return (
    <Stack.Navigator
      initialRouteName="Journey/Home"
      screenOptions={{
        contentStyle: { backgroundColor: color.bg.base },
        headerStyle: { backgroundColor: color.bg.surface },
        headerTintColor: color.text.primary,
        headerTitleStyle: { color: color.text.primary },
      }}
    >
      <Stack.Screen
        component={JourneyHomeScreen}
        name="Journey/Home"
        options={{ title: 'Journey' }}
      />
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
        component={AdaptiveFeedbackScreen}
        name="Journey/AdaptiveFeedback"
        options={{ title: '적응형 피드백' }}
      />
      <Stack.Screen
        component={AdaptiveSummaryScreen}
        name="Journey/AdaptiveSummary"
        options={{ title: '적응형 요약' }}
      />
      <Stack.Screen
        component={FeedbackScreen}
        name="Journey/Feedback"
        options={{ title: 'Feedback' }}
      />
    </Stack.Navigator>
  );
}
