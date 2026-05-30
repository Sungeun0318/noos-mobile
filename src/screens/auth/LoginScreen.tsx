import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { NoosLogo } from '@/components/brand/NoosLogo';
import { Button, TextInput, Toast } from '@/components/ui';
import { noosTelemetry } from '@/lib/telemetry';
import type { AuthStackParamList } from '@/navigation/AuthStack';
import { authErrorMessage } from '@/screens/auth/authValidation';
import { useAuthStore } from '@/stores/authStore';
import { color, space, type } from '@/theme';

type LoginProps = NativeStackScreenProps<AuthStackParamList, 'Auth/Login'>;

export function LoginScreen({ navigation }: LoginProps) {
  const mode = useAuthStore((state) => state.mode);
  const user = useAuthStore((state) => state.user);
  const login = useAuthStore((state) => state.login);
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    noosTelemetry.track('login_view');
  }, []);

  async function submit() {
    setSubmitting(true);
    setError(null);

    try {
      await login({ loginId: loginId.trim(), password });
      noosTelemetry.track('login_submit', { ok: true });
      navigation.getParent()?.goBack();
    } catch (submitError) {
      noosTelemetry.track('login_submit', { ok: false });
      setError(authErrorMessage(submitError, 'login'));
    } finally {
      setSubmitting(false);
    }
  }

  function goSignup() {
    noosTelemetry.track('login_to_signup_tap');
    navigation.navigate('Auth/Signup');
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <View style={styles.header}>
        <NoosLogo size={space['4xl']} />
        <Text style={styles.title}>로그인</Text>
        <Text style={styles.description}>NOOS 웹과 같은 계정을 사용해요.</Text>
      </View>

      {mode === 'authed' ? (
        <Toast message={`이미 ${user?.displayName ?? 'NOOS 계정'}으로 로그인되어 있어요`} variant="info" />
      ) : null}
      {error ? <Toast message={error} variant="danger" /> : null}

      <View style={styles.form}>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          label="아이디"
          onChangeText={setLoginId}
          textContentType="username"
          value={loginId}
        />
        <TextInput
          label="비밀번호"
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          value={password}
        />
      </View>

      <View style={styles.actions}>
        <Button
          fullWidth
          label="로그인"
          loading={submitting}
          disabled={mode === 'authed' || !loginId || !password}
          onPress={() => void submit()}
          size="lg"
        />
        <Button label="회원가입" onPress={goSignup} variant="ghost" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: space.sm,
  },
  container: {
    backgroundColor: color.bg.base,
  },
  content: {
    gap: space.xl,
    padding: space.xl,
  },
  description: {
    color: color.text.secondary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
  },
  form: {
    gap: space.lg,
  },
  header: {
    gap: space.sm,
  },
  title: {
    color: color.text.primary,
    fontFamily: type.h1.family,
    fontSize: type.h1.size,
    fontWeight: type.h1.weight,
    lineHeight: type.h1.lineHeight,
  },
});
