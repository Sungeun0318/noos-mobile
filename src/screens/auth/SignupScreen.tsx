import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { NoosLogo } from '@/components/brand/NoosLogo';
import { Button, Card, TextInput, Toast } from '@/components/ui';
import { noosTelemetry } from '@/lib/telemetry';
import type { AuthStackParamList } from '@/navigation/AuthStack';
import {
  authErrorMessage,
  hasSignupErrors,
  validateSignupInput,
  type SignupValidationErrors,
} from '@/screens/auth/authValidation';
import { useAuthStore } from '@/stores/authStore';
import { color, motion, radius, space, type } from '@/theme';

type SignupProps = NativeStackScreenProps<AuthStackParamList, 'Auth/Signup'>;

export function SignupScreen({ navigation }: SignupProps) {
  const mode = useAuthStore((state) => state.mode);
  const signup = useAuthStore((state) => state.signup);
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<SignupValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    noosTelemetry.track('signup_view');

    if (mode === 'authed') {
      setNotice('이미 로그인되어 있어요');
      setTimeout(() => navigation.getParent()?.goBack(), motion.duration.slower);
    }
  }, [mode, navigation]);

  async function submit() {
    const nextInput = {
      agreed,
      displayName: displayName.trim(),
      loginId: loginId.trim(),
      password,
      passwordConfirm,
    };
    const nextErrors = validateSignupInput(nextInput);
    setErrors(nextErrors);

    if (hasSignupErrors(nextErrors)) {
      return;
    }

    setSubmitting(true);

    try {
      await signup({
        displayName: nextInput.displayName,
        loginId: nextInput.loginId,
        password,
      });
      noosTelemetry.track('signup_submit', { ok: true });
      setNotice('지금까지의 기록이 이어졌어요');
      setTimeout(() => navigation.getParent()?.goBack(), motion.duration.slower);
    } catch (submitError) {
      noosTelemetry.track('signup_submit', { ok: false });
      setNotice(authErrorMessage(submitError, 'signup'));
    } finally {
      setSubmitting(false);
    }
  }

  function goLogin() {
    noosTelemetry.track('signup_to_login_tap');
    navigation.navigate('Auth/Login');
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <View style={styles.header}>
        <NoosLogo size={space['4xl']} />
        <Text style={styles.title}>회원가입</Text>
        <Text style={styles.description}>게스트 기록을 새 계정으로 이어받을 수 있어요.</Text>
      </View>

      {notice ? <Toast message={notice} variant={mode === 'authed' ? 'info' : 'warning'} /> : null}

      <View style={styles.form}>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.loginId}
          label="아이디"
          maxLength={20}
          onChangeText={setLoginId}
          textContentType="username"
          value={loginId}
        />
        <TextInput
          error={errors.password}
          label="비밀번호"
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
          value={password}
        />
        <TextInput
          error={errors.passwordConfirm}
          label="비밀번호 확인"
          onChangeText={setPasswordConfirm}
          secureTextEntry
          textContentType="newPassword"
          value={passwordConfirm}
        />
        <TextInput
          error={errors.displayName}
          label="표시 이름"
          onChangeText={setDisplayName}
          value={displayName}
        />
      </View>

      <Card level={2} padding="lg">
        <Text style={styles.claimText}>지금까지의 측정/세션 기록이 새 계정으로 이어집니다.</Text>
      </Card>

      <Pressable accessibilityRole="checkbox" onPress={() => setAgreed((value) => !value)} style={styles.termsRow}>
        <View style={[styles.checkbox, agreed && styles.checkboxSelected]} />
        <View style={styles.termsCopy}>
          <Text style={styles.termsText}>서비스와 개인정보 처리에 동의해요</Text>
          {errors.agreed ? <Text style={styles.errorText}>{errors.agreed}</Text> : null}
        </View>
      </Pressable>

      <View style={styles.actions}>
        <Button
          fullWidth
          label="가입하기"
          loading={submitting}
          disabled={mode === 'authed'}
          onPress={() => void submit()}
          size="lg"
        />
        <Button label="이미 계정이 있어요" onPress={goLogin} variant="ghost" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: space.sm,
  },
  checkbox: {
    backgroundColor: color.bg.elevated,
    borderColor: color.border.default,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    height: space.xl,
    width: space.xl,
  },
  checkboxSelected: {
    backgroundColor: color.brand.accent,
    borderColor: color.brand.accent,
  },
  claimText: {
    color: color.text.secondary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
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
  errorText: {
    color: color.state.danger,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
  },
  form: {
    gap: space.lg,
  },
  header: {
    gap: space.sm,
  },
  termsCopy: {
    flex: 1,
    gap: space.xs,
  },
  termsRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
  },
  termsText: {
    color: color.text.primary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
  },
  title: {
    color: color.text.primary,
    fontFamily: type.h1.family,
    fontSize: type.h1.size,
    fontWeight: type.h1.weight,
    lineHeight: type.h1.lineHeight,
  },
});
