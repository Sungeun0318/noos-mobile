import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LoginScreen } from '@/screens/auth/LoginScreen';
import { SignupScreen } from '@/screens/auth/SignupScreen';
import { color } from '@/theme';

export type AuthStackParamList = {
  'Auth/Login': undefined;
  'Auth/Signup': undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: color.bg.base },
        headerStyle: { backgroundColor: color.bg.surface },
        headerTintColor: color.text.primary,
        headerTitleStyle: { color: color.text.primary },
      }}
    >
      <Stack.Screen component={LoginScreen} name="Auth/Login" options={{ title: 'Login' }} />
      <Stack.Screen component={SignupScreen} name="Auth/Signup" options={{ title: 'Signup' }} />
    </Stack.Navigator>
  );
}
