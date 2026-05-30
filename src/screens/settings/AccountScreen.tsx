import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Toast } from '@/components/ui';
import { noosTelemetry } from '@/lib/telemetry';
import type { SettingsStackParamList } from '@/navigation/SettingsStack';
import { useAuthStore } from '@/stores/authStore';
import { color, space, type } from '@/theme';

type AccountNavigation = NativeStackNavigationProp<SettingsStackParamList, 'Settings/Account'>;
type RootAuthRoute = 'Auth/Login' | 'Auth/Signup';

export function AccountScreen() {
  const navigation = useNavigation<AccountNavigation>();
  const mode = useAuthStore((state) => state.mode);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    noosTelemetry.track('account_view', { mode });
  }, [mode]);

  function openAuth(screen: RootAuthRoute) {
    navigation.getParent()?.navigate('Auth', { screen });
  }

  async function submitLogout() {
    setBusy(true);
    noosTelemetry.track('account_logout');

    try {
      await logout();
      setToast('로그아웃했어요');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      {toast ? <Toast message={toast} variant="info" /> : null}

      {mode === 'authed' && user ? (
        <View style={styles.stack}>
          <Card level={1} padding="xl">
            <View style={styles.stack}>
              <Text style={styles.eyebrow}>NOOS 계정</Text>
              <Text style={styles.title}>{user.displayName}</Text>
              <Text style={styles.description}>{user.loginId}</Text>
            </View>
          </Card>
          <Button
            fullWidth
            label="로그아웃"
            loading={busy}
            onPress={() => void submitLogout()}
            variant="destructive"
          />
        </View>
      ) : (
        <View style={styles.stack}>
          <Card level={1} padding="xl">
            <View style={styles.stack}>
              <Text style={styles.title}>계정을 연결하세요</Text>
              <Text style={styles.description}>
                기록을 안전하게 보관하고 다른 기기에서도 이어가려면 가입하세요.
              </Text>
              <Text style={styles.smallText}>NOOS 웹과 같은 계정을 사용합니다.</Text>
            </View>
          </Card>
          <Button fullWidth label="회원가입" onPress={() => openAuth('Auth/Signup')} size="lg" />
          <Button fullWidth label="로그인" onPress={() => openAuth('Auth/Login')} variant="secondary" />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  eyebrow: {
    color: color.text.tertiary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    letterSpacing: 0.4,
    lineHeight: type.caption.lineHeight,
  },
  smallText: {
    color: color.text.tertiary,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
  },
  stack: {
    gap: space.lg,
  },
  title: {
    color: color.text.primary,
    fontFamily: type.h2.family,
    fontSize: type.h2.size,
    fontWeight: type.h2.weight,
    lineHeight: type.h2.lineHeight,
  },
});
